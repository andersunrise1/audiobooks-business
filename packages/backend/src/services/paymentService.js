import { pool } from '../config/database.js';
import { stripeClient } from '../config/stripe.js';

// TECHSPEAKING Vitalicio: one-time purchase, not a subscription (Dia 46's
// pricing decision) - see PRICING.md/MONETIZATION.md.
export const LIFETIME_PRICE_BRL_CENTS = 5700;
export const LIFETIME_PRODUCT_NAME = 'TECHSPEAKING Vitalicio';

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isWebhookConfigured() {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

// priceBrlCents/experiment let Dia 55-56's pricing A/B test charge the
// variant price actually shown to the buyer; experiment.subjectId/variant
// are stashed in the session metadata so the webhook can attribute the
// eventual conversion back to the same experiment subject that was exposed
// to it (see experimentService.js).
export async function createLifetimeCheckoutSession(
  user,
  { priceBrlCents = LIFETIME_PRICE_BRL_CENTS, experiment } = {},
) {
  // FRONTEND_URL is a comma-separated list since Dia 75's multi-origin CORS
  // support (app.js) - a redirect target needs exactly one URL, not the
  // raw list, so take the first entry.
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();

  return stripeClient.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: { name: LIFETIME_PRODUCT_NAME },
          unit_amount: priceBrlCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: user.id,
      ...(experiment
        ? {
            experimentName: experiment.name,
            experimentSubjectId: experiment.subjectId,
            experimentVariant: experiment.variant,
          }
        : {}),
    },
    success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/payment/cancel`,
  });
}

export function constructWebhookEvent(rawBody, signature) {
  return stripeClient.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET,
  );
}

// Only resets purchased_at/refunded_at when the incoming payment_intent is
// actually new (IS DISTINCT FROM), not just on every grant call - Stripe
// can redeliver the same checkout.session.completed event (Dia 50's
// idempotency test), and a redelivery must not push the refund window
// back out. A genuinely new payment_intent (e.g. the user buys again after
// an earlier refund) does start a fresh window, which is correct.
export async function grantLifetimeAccess(userId, paymentIntentId = null) {
  await pool.query(
    `UPDATE users
     SET plan = 'pro',
         purchased_at = CASE WHEN stripe_payment_intent_id IS DISTINCT FROM $2 THEN now() ELSE purchased_at END,
         refunded_at = CASE WHEN stripe_payment_intent_id IS DISTINCT FROM $2 THEN NULL ELSE refunded_at END,
         stripe_payment_intent_id = $2
     WHERE id = $1`,
    [userId, paymentIntentId],
  );
}

// CDC Art. 49 (Codigo de Defesa do Consumidor): a 7-day right of withdrawal
// for purchases made outside a commercial establishment, which an online
// checkout is - see HelpCenterPage's FAQ. This is the statutory floor, not
// a marketing choice, so it isn't one of PRICING.md's tunable numbers.
export const REFUND_WINDOW_DAYS = 7;

export function isWithinRefundWindow(purchasedAt) {
  if (!purchasedAt) return false;
  const elapsedMs = Date.now() - new Date(purchasedAt).getTime();
  return elapsedMs <= REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

// Actually moves money back via Stripe's real Refunds API, then revokes
// access - the two happen together so a refunded purchase can't leave the
// account with (or without) access inconsistent with what was actually
// charged.
export async function refundLifetimePurchase(user) {
  await stripeClient.refunds.create({ payment_intent: user.stripe_payment_intent_id });
  await pool.query(`UPDATE users SET plan = 'free', refunded_at = now() WHERE id = $1`, [user.id]);
}

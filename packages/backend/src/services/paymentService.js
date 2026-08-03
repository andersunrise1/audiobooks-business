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
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

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

export async function grantLifetimeAccess(userId) {
  await pool.query(`UPDATE users SET plan = 'pro' WHERE id = $1`, [userId]);
}

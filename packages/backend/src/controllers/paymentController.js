import { pool } from '../config/database.js';
import {
  isStripeConfigured,
  isWebhookConfigured,
  createLifetimeCheckoutSession,
  constructWebhookEvent,
  grantLifetimeAccess,
  refundLifetimePurchase,
  isWithinRefundWindow,
  REFUND_WINDOW_DAYS,
} from '../services/paymentService.js';
import { getVariantName, getVariantConfig, logConversion } from '../services/experimentService.js';

export const STRIPE_NOT_CONFIGURED_ERROR =
  'Payments are not configured (missing STRIPE_SECRET_KEY)';

const PRICING_EXPERIMENT = 'pricing_price';

export async function createCheckoutSession(req, res) {
  if (!isStripeConfigured()) {
    return res.status(503).json({ error: STRIPE_NOT_CONFIGURED_ERROR });
  }

  const { rows } = await pool.query('SELECT id, email, plan FROM users WHERE id = $1', [
    req.user.id,
  ]);
  const user = rows[0];

  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }

  if (user.plan === 'pro') {
    return res.status(400).json({ error: 'user already has lifetime access' });
  }

  // subjectId lets the checkout price match whatever variant the buyer was
  // actually shown pre-purchase (an anonymous visitor id persisted since
  // before login) - falls back to the user id so the endpoint still works
  // without a client-supplied subjectId.
  const subjectId = req.body?.subjectId || user.id;
  const variant = getVariantName(PRICING_EXPERIMENT, subjectId);
  const variantConfig = getVariantConfig(PRICING_EXPERIMENT, variant);

  const session = await createLifetimeCheckoutSession(user, {
    priceBrlCents: variantConfig?.priceBrlCents,
    experiment: { name: PRICING_EXPERIMENT, subjectId, variant },
  });
  res.json({ url: session.url });
}

export async function handleStripeWebhook(req, res) {
  if (!isWebhookConfigured()) {
    return res
      .status(503)
      .json({ error: 'Webhook is not configured (missing STRIPE_WEBHOOK_SECRET)' });
  }

  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = constructWebhookEvent(req.body, signature);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'invalid signature' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (userId) {
      await grantLifetimeAccess(userId, session.payment_intent ?? null);
    } else {
      console.error('checkout.session.completed webhook missing metadata.userId', session.id);
    }

    const { experimentName, experimentSubjectId, experimentVariant } = session.metadata ?? {};
    if (experimentName && experimentSubjectId && experimentVariant) {
      await logConversion(experimentName, experimentSubjectId, experimentVariant, {
        sessionId: session.id,
      });
    }
  }

  res.json({ received: true });
}

// Self-service refund within the CDC Art. 49 7-day window (HelpCenterPage's
// FAQ) - actually calls Stripe's real Refunds API and revokes access, not
// just a support-ticket request. Guard order mirrors the other 400/403
// checks in this app (specific, actionable errors before the generic
// "contact support" catch-all), so a user sees exactly why they can't
// self-refund instead of a vague failure.
export async function refundPurchase(req, res) {
  if (!isStripeConfigured()) {
    return res.status(503).json({ error: STRIPE_NOT_CONFIGURED_ERROR });
  }

  const { rows } = await pool.query(
    'SELECT id, plan, stripe_payment_intent_id, purchased_at, refunded_at FROM users WHERE id = $1',
    [req.user.id],
  );
  const user = rows[0];

  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }

  if (user.plan !== 'pro') {
    return res.status(400).json({ error: 'this account has no lifetime purchase to refund' });
  }

  if (user.refunded_at) {
    return res.status(400).json({ error: 'this purchase has already been refunded' });
  }

  if (!user.stripe_payment_intent_id) {
    return res.status(400).json({
      error:
        'no purchase record found for this account - contact support if you believe this is an error',
    });
  }

  if (!isWithinRefundWindow(user.purchased_at)) {
    return res.status(403).json({
      error: `the ${REFUND_WINDOW_DAYS}-day refund window has expired - contact support for other options`,
    });
  }

  await refundLifetimePurchase(user);
  res.json({ refunded: true });
}

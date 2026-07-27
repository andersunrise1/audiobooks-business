import { pool } from '../config/database.js';
import {
  isStripeConfigured,
  isWebhookConfigured,
  createLifetimeCheckoutSession,
  constructWebhookEvent,
  grantLifetimeAccess,
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
      await grantLifetimeAccess(userId);
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

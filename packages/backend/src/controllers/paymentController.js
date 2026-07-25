import { pool } from '../config/database.js';
import {
  isStripeConfigured,
  isWebhookConfigured,
  createLifetimeCheckoutSession,
  constructWebhookEvent,
  grantLifetimeAccess,
} from '../services/paymentService.js';

export const STRIPE_NOT_CONFIGURED_ERROR =
  'Payments are not configured (missing STRIPE_SECRET_KEY)';

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

  const session = await createLifetimeCheckoutSession(user);
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
  }

  res.json({ received: true });
}

import { pool } from '../config/database.js';
import {
  isMercadoPagoConfigured,
  isWebhookConfigured,
  createLifetimeCheckoutSession,
  verifyWebhookSignature,
  getPayment,
  grantLifetimeAccess,
  refundLifetimePurchase,
  isWithinRefundWindow,
  REFUND_WINDOW_DAYS,
} from '../services/paymentService.js';
import { getVariantName, getVariantConfig, logConversion } from '../services/experimentService.js';

export const MERCADOPAGO_NOT_CONFIGURED_ERROR =
  'Payments are not configured (missing MERCADOPAGO_ACCESS_TOKEN)';

const PRICING_EXPERIMENT = 'pricing_price';

export async function createCheckoutSession(req, res) {
  if (!isMercadoPagoConfigured()) {
    return res.status(503).json({ error: MERCADOPAGO_NOT_CONFIGURED_ERROR });
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

// Mercado Pago retries a failed/slow-to-acknowledge notification every 15
// minutes and expects a 200/201 within 22s - grantLifetimeAccess/
// logConversion run before responding here (not queued for later), but
// both are fast single-row DB writes, well inside that window.
export async function handleMercadoPagoWebhook(req, res) {
  if (!isWebhookConfigured()) {
    return res
      .status(503)
      .json({ error: 'Webhook is not configured (missing MERCADOPAGO_WEBHOOK_SECRET)' });
  }

  if (!verifyWebhookSignature(req)) {
    console.error('Mercado Pago webhook signature verification failed');
    return res.status(400).json({ error: 'invalid signature' });
  }

  const { type } = req.body ?? {};
  const paymentId = req.body?.data?.id;

  if (type === 'payment' && paymentId) {
    const payment = await getPayment(paymentId);

    if (payment.status === 'approved') {
      const userId = payment.metadata?.user_id;

      if (userId) {
        await grantLifetimeAccess(userId, String(payment.id));
      } else {
        console.error('approved payment webhook missing metadata.user_id', payment.id);
      }

      const experimentName = payment.metadata?.experiment_name;
      const experimentSubjectId = payment.metadata?.experiment_subject_id;
      const experimentVariant = payment.metadata?.experiment_variant;
      if (experimentName && experimentSubjectId && experimentVariant) {
        await logConversion(experimentName, experimentSubjectId, experimentVariant, {
          paymentId: payment.id,
        });
      }
    }
  }

  res.json({ received: true });
}

// Self-service refund within the CDC Art. 49 7-day window (HelpCenterPage's
// FAQ) - actually calls Mercado Pago's real refund API and revokes access,
// not just a support-ticket request. Guard order mirrors the other 400/403
// checks in this app (specific, actionable errors before the generic
// "contact support" catch-all), so a user sees exactly why they can't
// self-refund instead of a vague failure.
export async function refundPurchase(req, res) {
  if (!isMercadoPagoConfigured()) {
    return res.status(503).json({ error: MERCADOPAGO_NOT_CONFIGURED_ERROR });
  }

  const { rows } = await pool.query(
    'SELECT id, plan, mp_payment_id, purchased_at, refunded_at FROM users WHERE id = $1',
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

  if (!user.mp_payment_id) {
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

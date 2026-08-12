import crypto from 'crypto';
import { Preference, Payment, PaymentRefund } from 'mercadopago';
import { pool } from '../config/database.js';
import { mpClient } from '../config/mercadopago.js';

// TECHSPEAKING Vitalicio: one-time purchase, not a subscription (Dia 46's
// pricing decision) - see PRICING.md/MONETIZATION.md.
export const LIFETIME_PRICE_BRL_CENTS = 5700;
export const LIFETIME_PRODUCT_NAME = 'TECHSPEAKING Vitalicio';

export function isMercadoPagoConfigured() {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

export function isWebhookConfigured() {
  return Boolean(process.env.MERCADOPAGO_WEBHOOK_SECRET);
}

// priceBrlCents/experiment let Dia 55-56's pricing A/B test charge the
// variant price actually shown to the buyer; experiment.subjectId/variant
// are stashed in the preference metadata so the webhook can attribute the
// eventual conversion back to the same experiment subject that was exposed
// to it (see experimentService.js).
//
// Metadata keys are sent snake_case on purpose: Mercado Pago normalizes
// metadata keys to snake_case server-side regardless of what's sent, so a
// camelCase key here would come back as a different key in the webhook
// payload than the one used to create the preference - a well-known
// footgun with this API. Sending snake_case from the start means the
// create/read shape actually matches.
export async function createLifetimeCheckoutSession(
  user,
  { priceBrlCents = LIFETIME_PRICE_BRL_CENTS, experiment } = {},
) {
  // FRONTEND_URL is a comma-separated list since Dia 75's multi-origin CORS
  // support (app.js) - a redirect target needs exactly one URL, not the
  // raw list, so take the first entry.
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
  const backendUrl = process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000';

  // Real bug caught by testing against the live API, not assumed from docs:
  // Mercado Pago rejects auto_return with "back_url.success must be
  // defined" whenever back_urls.success isn't a real https:// URL - a plain
  // `http://localhost:5173` back_url is otherwise accepted (checkout still
  // works, the buyer just has to click their own way back), but combining
  // it with auto_return fails the whole preference creation outright. Only
  // send auto_return once there's a real https:// FRONTEND_URL (i.e. a real
  // deployed domain) so local dev can still create a working preference.
  const canAutoReturn = frontendUrl.startsWith('https://');

  const preference = new Preference(mpClient);
  const result = await preference.create({
    body: {
      items: [
        {
          title: LIFETIME_PRODUCT_NAME,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: priceBrlCents / 100,
        },
      ],
      payer: { email: user.email },
      metadata: {
        user_id: user.id,
        ...(experiment
          ? {
              experiment_name: experiment.name,
              experiment_subject_id: experiment.subjectId,
              experiment_variant: experiment.variant,
            }
          : {}),
      },
      back_urls: {
        success: `${frontendUrl}/payment/success`,
        failure: `${frontendUrl}/payment/cancel`,
        pending: `${frontendUrl}/payment/cancel`,
      },
      ...(canAutoReturn ? { auto_return: 'approved' } : {}),
      // Needs a publicly reachable URL - on this dev machine there's no
      // tunnel set up yet, same accepted local limitation Stripe's webhook
      // had before it (PAYMENT_TROUBLESHOOTING.md).
      notification_url: `${backendUrl}/api/payment/webhook`,
    },
  });

  // sandbox_init_point only exists for TEST access tokens on some account
  // configurations - falling back to it keeps local/sandbox testing working
  // without a separate code path once real credentials exist.
  return { url: result.init_point ?? result.sandbox_init_point };
}

// Mercado Pago's webhook signature is computed from headers + the
// notification's query string, not the raw request body (unlike Stripe's
// raw-byte HMAC) - see https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications.md.
// Manifest format: "id:<data.id lowercased>;request-id:<x-request-id>;ts:<ts>;",
// HMAC-SHA256'd with the webhook secret from the Mercado Pago dashboard.
export function verifyWebhookSignature(req) {
  const signatureHeader = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  const dataId = req.query['data.id'];

  if (!signatureHeader || !requestId || !dataId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) =>
      part
        .trim()
        .split('=')
        .map((s) => s.trim()),
    ),
  );
  const { ts, v1: expectedHash } = parts;
  if (!ts || !expectedHash) return false;

  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`;
  const computedHash = crypto
    .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET)
    .update(manifest)
    .digest('hex');

  const expected = Buffer.from(expectedHash);
  const computed = Buffer.from(computedHash);
  if (expected.length !== computed.length) return false;

  return crypto.timingSafeEqual(expected, computed);
}

export async function getPayment(paymentId) {
  const payment = new Payment(mpClient);
  return payment.get({ id: paymentId });
}

// Only resets purchased_at/refunded_at when the incoming paymentId is
// actually new (IS DISTINCT FROM), not just on every grant call - Mercado
// Pago can redeliver the same notification, and a redelivery must not push
// the refund window back out. A genuinely new paymentId (e.g. the user buys
// again after an earlier refund) does start a fresh window, which is correct.
export async function grantLifetimeAccess(userId, paymentId = null) {
  await pool.query(
    `UPDATE users
     SET plan = 'pro',
         purchased_at = CASE WHEN mp_payment_id IS DISTINCT FROM $2 THEN now() ELSE purchased_at END,
         refunded_at = CASE WHEN mp_payment_id IS DISTINCT FROM $2 THEN NULL ELSE refunded_at END,
         mp_payment_id = $2
     WHERE id = $1`,
    [userId, paymentId],
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

// Actually moves money back via Mercado Pago's real refund API, then
// revokes access - the two happen together so a refunded purchase can't
// leave the account with (or without) access inconsistent with what was
// actually charged.
export async function refundLifetimePurchase(user) {
  const paymentRefund = new PaymentRefund(mpClient);
  await paymentRefund.total({ payment_id: user.mp_payment_id });
  await pool.query(`UPDATE users SET plan = 'free', refunded_at = now() WHERE id = $1`, [user.id]);
}

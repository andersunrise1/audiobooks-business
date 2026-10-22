import fs from 'fs';
import { google } from 'googleapis';
import { pool } from '../config/database.js';

// Second lifetime-purchase path alongside Mercado Pago (paymentService.js) -
// a purchase made inside the Android app via Google Play Billing. Kept in
// its own file rather than merged into paymentService.js since the two
// providers have unrelated SDKs/credentials and now genuinely coexist
// (unlike the Stripe->Mercado Pago swap, which replaced one provider with
// another). The product id here must match exactly what's configured as a
// one-time ("managed") in-app product in Play Console.
export const LIFETIME_PRODUCT_ID = 'techspeak_vitalicio';

// Read fresh on every call, like paymentService.js's isMercadoPagoConfigured
// - not cached into a module-level const at import time - so tests can
// toggle these env vars per-case regardless of import order.
export function isGooglePlayConfigured() {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  const keyPath = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH;
  return Boolean(packageName && keyPath && fs.existsSync(keyPath));
}

// Not cached across calls on purpose: building this client does no network
// I/O (GoogleAuth only reads/parses the key file lazily, on the first real
// token request), and a fresh instance per call avoids any stale-client risk
// from an earlier test's env vars. Tests mock google.androidpublisher itself
// (see googlePlayService.test.js) rather than this function's return value.
function getPublisherClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  return google.androidpublisher({ version: 'v3', auth });
}

// purchaseState: 0 = purchased, 1 = canceled, 2 = pending.
// acknowledgementState: 0 = yet to be acknowledged, 1 = acknowledged.
export async function getProductPurchase(purchaseToken, productId = LIFETIME_PRODUCT_ID) {
  const publisher = getPublisherClient();
  const { data } = await publisher.purchases.products.get({
    packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME,
    productId,
    token: purchaseToken,
  });
  return data;
}

// Google auto-refunds a purchase that isn't acknowledged within 3 days, so
// this must run right after a real purchaseState === 0 is confirmed, not
// deferred to a later job.
export async function acknowledgeProductPurchase(purchaseToken, productId = LIFETIME_PRODUCT_ID) {
  const publisher = getPublisherClient();
  await publisher.purchases.products.acknowledge({
    packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME,
    productId,
    token: purchaseToken,
    requestBody: {},
  });
}

// Mirrors paymentService.js's grantLifetimeAccess exactly (same
// IS DISTINCT FROM guard so a redelivered/retried verify call doesn't push
// the refund window back out), keyed off google_play_purchase_token instead
// of mp_payment_id - a lifetime grant via either provider is otherwise
// identical, since `plan` is what every other part of the app actually reads.
export async function grantLifetimeAccessFromGooglePlay(userId, purchaseToken) {
  await pool.query(
    `UPDATE users
     SET plan = 'pro',
         purchased_at = CASE WHEN google_play_purchase_token IS DISTINCT FROM $2 THEN now() ELSE purchased_at END,
         refunded_at = CASE WHEN google_play_purchase_token IS DISTINCT FROM $2 THEN NULL ELSE refunded_at END,
         google_play_purchase_token = $2
     WHERE id = $1`,
    [userId, purchaseToken],
  );
}

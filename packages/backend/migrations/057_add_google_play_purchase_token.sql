-- Google Play Billing as a second lifetime-purchase path, alongside Mercado
-- Pago (migration 056) - a user who buys inside the Android app via Play
-- Billing gets the exact same `plan = 'pro'` as one who buys on the website,
-- so access is shared across mobile/desktop for either purchase path.
-- Additive, mirrors mp_payment_id's own shape rather than a shared column,
-- since the two providers have unrelated id formats and independent refund
-- flows (grantLifetimeAccessFromGooglePlay/refundLifetimePurchase stay
-- separate functions per provider, same as the Stripe->Mercado Pago split).
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_play_purchase_token TEXT;

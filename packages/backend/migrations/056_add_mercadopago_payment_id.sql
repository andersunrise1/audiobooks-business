-- Replaces Stripe with Mercado Pago as the payment provider (2026-08-11
-- decision, forced by a stuck Stripe identity-verification review tied to
-- a CEP renumbering the user's address history couldn't clear in time).
-- Additive, not a rename: `stripe_payment_intent_id` (migration 050) is
-- left untouched for any historical row, since this app has never had a
-- real paying Stripe customer to migrate - grantLifetimeAccess/
-- refundLifetimePurchase now read/write this column instead.
ALTER TABLE users ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;

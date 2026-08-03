-- Tracks the real Stripe charge behind a lifetime purchase, so a refund
-- can be tied back to it and the 7-day CDC Art. 49 window (HelpCenterPage
-- FAQ) can actually be checked - previously grantLifetimeAccess only ever
-- set `plan = 'pro'`, with no record of which charge or when.
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

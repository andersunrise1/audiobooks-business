-- Expands the free tier from 2 to 8 audiobooks (2026-11-06 decision), paired
-- with adding ad-supported monetization (Google AdMob, mobile) for
-- non-Vitalicio users. Previously the free tier was deliberately small (2
-- audiobooks) to drive the one-time purchase - that still works for a
-- content-paywall model, but it actively hurts an ad-supported model: a
-- free user who runs out of content in one sitting uninstalls instead of
-- coming back to generate more ad impressions. Picked to cover all 3
-- catalog pillars (Career/DevOps/Software Engineering) and both
-- beginner/intermediate levels, deliberately excluding every 'advanced'
-- title - advanced content stays an exclusively Vitalicio-tier incentive.
-- Idempotent (safe to re-run): explicit title match, not ON CONFLICT, since
-- this UPDATEs existing rows rather than inserting new ones.
UPDATE audiobooks
SET is_free = true
WHERE title IN (
  'Networking at Tech Events',
  '1:1s & Performance Reviews',
  'Cloud & DevOps',
  'Git & Code Review',
  'Testing & QA',
  'API Design'
);

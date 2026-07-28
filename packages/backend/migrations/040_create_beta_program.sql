-- Dia 76-77: Beta Tester Program. is_beta_tester is a separate flag from
-- plan (not a distinct plan value) so every existing plan === 'pro' check
-- across the app (paywall, AI rate limits, dashboard badges) keeps working
-- unchanged for a beta tester - granting beta status also sets plan =
-- 'pro' directly (see betaProgramService.js), this column just tracks
-- *how* they got there, for reporting and so revoking beta status doesn't
-- have to guess whether a later real purchase should also be undone.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_beta_tester BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS beta_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR NOT NULL, -- bug, feature_request, general
  rating INT, -- optional 1-5 satisfaction pulse
  message TEXT NOT NULL,
  was_beta_tester BOOLEAN NOT NULL, -- snapshot of is_beta_tester at submission time
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_user_id ON beta_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_created_at ON beta_feedback(created_at);

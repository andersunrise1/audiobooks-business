-- Lets a chapter have two narration audio files (female/male), generated
-- by scripts/generateNarration.js, so the player can offer a voice choice
-- instead of one fixed narrator. The existing `audio_url` column is left
-- untouched (it still serves Daily Standup/Opening's original seed audio)
-- and is used as a fallback when neither gendered version exists yet.
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS audio_url_female TEXT;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS audio_url_male TEXT;

-- Dia 51-52: CMS scheduling. NULL = draft (never shown publicly); a future
-- timestamp = scheduled; a past/now timestamp = published. DEFAULT now()
-- means a plain INSERT that doesn't mention this column (every pre-Dia-51
-- code path and test fixture) stays published-immediately, matching prior
-- behavior; the CMS upload endpoint explicitly writes NULL for a draft,
-- which overrides the default since the column is named in that INSERT.
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT now();

UPDATE audiobooks SET published_at = created_at WHERE published_at IS NULL;

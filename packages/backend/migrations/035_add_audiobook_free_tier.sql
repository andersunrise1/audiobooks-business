-- Dia 49: Free-tier paywall. Free accounts (and anonymous browsing) get a
-- fixed set of audiobooks so the catalog is browsable but full playback
-- requires TechSpeak Vitalicio (see PRICING.md's "Free - R$ 0 (trial)").
ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT false;

-- "Daily Standup" (the original flagship content, Dia 11-41) covers technical
-- vocabulary; "Remote Work Communication" (Dia 46) covers the career/soft-skill
-- side of the catalog - together they show both content pillars in the trial,
-- not just one. Both are beginner level.
UPDATE audiobooks SET is_free = true
WHERE title IN ('Daily Standup', 'Remote Work Communication');

-- Fixes a real race condition in POST /api/ai/translate-word (Dia [current]'s
-- click-any-word feature): it checks for an existing (word, chapter_id) row,
-- then inserts if none is found, with no atomic guard in between - two
-- near-simultaneous requests for the same untagged word (e.g. a fast
-- double-click before the button re-renders) can both pass the check and
-- both insert, creating a duplicate row. Caught for real: clicking "Jordan"
-- during live testing left two rows for the exact same (word, chapter_id).

-- Case-insensitive dedupe first (same ROW_NUMBER pattern as migration 043),
-- required before the unique index below can be created - there is
-- currently exactly one such pair (the "Jordan" rows above).
DELETE FROM words
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY chapter_id, lower(word) ORDER BY created_at
    ) AS rn
    FROM words
  ) ranked
  WHERE rn > 1
);

-- Enforces the invariant at the database level instead of only in
-- application code, so the race can no longer produce a duplicate row
-- regardless of request timing.
CREATE UNIQUE INDEX IF NOT EXISTS words_chapter_id_lower_word_key
  ON words (chapter_id, lower(word));

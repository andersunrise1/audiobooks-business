-- Two real bugs surfaced by re-checking the catalog after migration 042,
-- not by inspection alone:
--
-- 1. Migration 042 (and 041 before it) blindly INSERTed vocabulary tags
--    without checking whether that (word, chapter_id) pair already existed
--    from the original seed data - every chapter that already had a tagged
--    word before the narrative rewrite ended up with a duplicate row for
--    it (e.g. two "deployed" rows on Daily Standup/Opening, two "bug" rows
--    on Code Review Etiquette/Being Specific). Harmless for translation
--    (both rows resolve to the same word/dictionary entry), but wasteful
--    and worth cleaning up now rather than letting it compound across
--    future batches.
--
-- 2. Dia 11's original seed tagged every single word of "Opening"'s
--    one-sentence transcript ("Yesterday"/"I"/"a"/"new"/"version.") -
--    harmless when the whole chapter was that one sentence, but now that
--    migration 042 turned this chapter into a full narrative paragraph,
--    those common words match themselves everywhere they appear in the
--    new text, making ordinary words like "a" and "new" clickable
--    throughout - confirmed live in-browser after applying 042.

-- Fix #1: keep only the earliest row per (word, chapter_id), catalog-wide.
DELETE FROM words
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY word, chapter_id ORDER BY created_at) AS rn
    FROM words
  ) ranked
  WHERE rn > 1
);

-- Fix #2: drop the meaningless legacy single-common-word tags on Daily
-- Standup's Opening chapter. "deployed" (already deduplicated by fix #1
-- above) is the one tag worth keeping there.
DELETE FROM words
WHERE chapter_id = (
  SELECT id FROM chapters
  WHERE title = 'Opening'
    AND audiobook_id = (SELECT id FROM audiobooks WHERE title = 'Daily Standup')
)
AND word IN ('Yesterday', 'I', 'a', 'new', 'version.');

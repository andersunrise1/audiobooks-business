-- Batch 3's narrative rewrite (migration 046) reused "async" for Remote
-- Work Communication's "Async Updates" chapter, but the original seed data
-- had also tagged "time zone" there - the new text says "time zones"
-- (plural), so that second tag no longer matches, the same word-form-
-- mismatch class first caught on Dia 42. It's safe to simply remove: "time
-- zone" is still correctly tagged on the same book's "Timezone
-- Coordination" chapter, so the concept isn't lost from the catalog.
DELETE FROM words
WHERE word = 'time zone'
  AND chapter_id = (
    SELECT c.id FROM chapters c
    JOIN audiobooks ab ON c.audiobook_id = ab.id
    WHERE ab.title = 'Remote Work Communication' AND c.title = 'Async Updates'
  );

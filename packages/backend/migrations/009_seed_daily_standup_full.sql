-- Backfills the audiobook/chapter/word that had only ever existed as a
-- manually-inserted local dev fixture (never committed - see CLAUDE.md Dia
-- 42) and extends it into the full 5-chapter template from Dia 41.
INSERT INTO audiobooks (id, title, description, category, level, duration_minutes)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Daily Standup',
  'Frases de reuniao diaria em ingles tecnico',
  'Software Engineering',
  'beginner',
  15
)
ON CONFLICT (id) DO UPDATE SET duration_minutes = EXCLUDED.duration_minutes;

INSERT INTO chapters (id, audiobook_id, title, order_index, audio_url, duration_seconds, transcript)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Opening',
  1,
  'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
  2,
  'Yesterday I deployed a new version.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES (
  'priorities',
  'substantivo',
  'Prioridades',
  'As tarefas ou objetivos mais importantes que devem ser feitos primeiro em um periodo de trabalho.',
  'Our top priorities this sprint are the checkout flow and the reported bugs.',
  ARRAY['Agile', 'Daily Standup']
)
ON CONFLICT (word) DO NOTHING;

WITH ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Updates',
    2,
    'Today I''m working on the payment integration. I''m adding tests for the new endpoint.'
  )
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Blockers',
    3,
    'My only blocker is waiting for the API keys from the client. I can''t test the webhook without them.'
  )
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Planning',
    4,
    'For this sprint, our priorities are finishing the checkout flow and fixing the reported bugs. Let''s also refactor the old authentication module.'
  )
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Closing',
    5,
    'That''s all from me. Does anyone have questions, or need help with their blockers?'
  )
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'endpoint', id FROM ch2
UNION ALL SELECT 'blocker', id FROM ch3
UNION ALL SELECT 'webhook', id FROM ch3
UNION ALL SELECT 'sprint', id FROM ch4
UNION ALL SELECT 'priorities', id FROM ch4
UNION ALL SELECT 'refactor', id FROM ch4;

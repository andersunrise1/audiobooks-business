INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES (
  'build',
  'substantivo',
  'Build (compilacao)',
  'O processo de transformar o codigo-fonte em uma versao executavel da aplicacao.',
  'The build failed right after I pushed my changes.',
  ARRAY['CI/CD']
)
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'CI/CD Troubleshooting',
    'Vocabulario tecnico para diagnosticar problemas de build e pipeline em ingles',
    'DevOps',
    'intermediate',
    15
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'A Broken Build', 1,
    'The build failed right after I pushed my changes.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Reading the Build Log', 2,
    'I opened the build log to see exactly which step failed.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Reproducing Locally', 3,
    'I ran the same command locally to reproduce the failure.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Fixing Forward', 4,
    'Instead of reverting, we decided to fix forward quickly.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'A Stable Pipeline', 5,
    'After the fix, the pipeline was stable again.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'build', id FROM ch1
UNION ALL SELECT 'build', id FROM ch2
UNION ALL SELECT 'pipeline', id FROM ch5;

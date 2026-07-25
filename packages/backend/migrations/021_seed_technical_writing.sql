INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES (
  'RFC',
  'substantivo',
  'RFC (proposta tecnica)',
  'Um documento que propoe e discute uma mudanca tecnica antes de ela ser implementada.',
  'I wrote an RFC to propose the new architecture.',
  ARRAY['Technical Writing']
)
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Technical Writing',
    'Vocabulario tecnico para documentacao, RFCs e escrita tecnica em ingles',
    'Software Engineering',
    'intermediate',
    15
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Writing a README', 1,
    'A good README explains what the project does and how to run it.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Proposing an RFC', 2,
    'I wrote an RFC to propose the new architecture before we started coding.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Documenting an API', 3,
    'We documented every endpoint so other teams could integrate easily.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Explaining Trade-offs', 4,
    'In the doc, I explained the trade-off between the two approaches.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Keeping Docs Updated', 5,
    'Outdated documentation is worse than no documentation at all.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'RFC', id FROM ch2
UNION ALL SELECT 'architecture', id FROM ch2
UNION ALL SELECT 'endpoint', id FROM ch3
UNION ALL SELECT 'trade-off', id FROM ch4;

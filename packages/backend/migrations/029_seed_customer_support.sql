INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'workaround',
    'substantivo',
    'Solucao temporaria',
    'Uma solucao provisoria para um problema, usada enquanto a correcao definitiva nao esta pronta.',
    'I offered a temporary workaround.',
    ARRAY['Support']
  ),
  (
    'ETA',
    'substantivo',
    'ETA (previsao de prazo)',
    'Sigla para "estimated time of arrival": uma previsao de quando algo sera concluido.',
    'I gave them a realistic ETA.',
    ARRAY['Support', 'Communication']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Customer Support Escalation',
    'Vocabulario tecnico para explicar problemas tecnicos a clientes em ingles',
    'Career',
    'intermediate',
    15
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Understanding the Complaint', 1,
    'The customer said the app was crashing every time they logged in.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Investigating the Issue', 2,
    'I asked for more details so I could investigate the issue properly.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Offering a Workaround', 3,
    'While we worked on a fix, I offered a temporary workaround.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Setting Expectations', 4,
    'I gave them a realistic ETA instead of promising an immediate fix.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Following Up', 5,
    'After the fix shipped, I did a quick follow up to confirm everything was working.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'issue', id FROM ch2
UNION ALL SELECT 'workaround', id FROM ch3
UNION ALL SELECT 'ETA', id FROM ch4
UNION ALL SELECT 'follow up', id FROM ch5;

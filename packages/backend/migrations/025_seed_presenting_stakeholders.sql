INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'jargon',
    'substantivo',
    'Jargao',
    'Vocabulario tecnico especifico de uma area, dificil de entender para quem esta de fora.',
    'I replaced technical jargon with simple language.',
    ARRAY['Communication']
  ),
  (
    'follow up',
    'substantivo',
    'Retorno/acompanhamento',
    'Uma acao ou mensagem posterior para dar continuidade a algo que ficou pendente.',
    'I promised to follow up.',
    ARRAY['Communication']
  ),
  (
    'demo',
    'substantivo',
    'Demonstracao',
    'Uma apresentacao ao vivo mostrando como uma funcionalidade ou produto funciona na pratica.',
    'I showed a live demo of the feature.',
    ARRAY['Communication', 'Agile']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Presenting to Stakeholders',
    'Vocabulario tecnico para apresentacoes a publico nao-tecnico em ingles',
    'Career',
    'advanced',
    18
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Knowing Your Audience', 1,
    'Before the presentation, I thought about how much technical detail the stakeholders needed.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Simplifying the Message', 2,
    'I replaced technical jargon with simple, everyday language.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Using a Demo', 3,
    'Instead of just slides, I showed a live demo of the feature.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Handling Questions', 4,
    'When I didn''t know an answer, I said so and promised to follow up.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Summarizing Next Steps', 5,
    'I ended the presentation with clear next steps for the team.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'stakeholders', id FROM ch1
UNION ALL SELECT 'jargon', id FROM ch2
UNION ALL SELECT 'demo', id FROM ch3
UNION ALL SELECT 'follow up', id FROM ch4;

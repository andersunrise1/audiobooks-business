INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'scope',
    'substantivo',
    'Escopo',
    'O conjunto de tarefas e entregas definidas para um projeto.',
    'I made sure the scope of the project was clear.',
    ARRAY['Freelancing', 'Project Management']
  ),
  (
    'deadline',
    'substantivo',
    'Prazo',
    'A data limite para a entrega de um trabalho.',
    'We agreed on a deadline that gave me enough buffer time.',
    ARRAY['Freelancing', 'Project Management']
  ),
  (
    'invoice',
    'substantivo',
    'Fatura/nota fiscal',
    'Um documento que cobra o pagamento por um servico prestado.',
    'I sent the client an invoice.',
    ARRAY['Freelancing']
  ),
  (
    'client',
    'substantivo',
    'Cliente',
    'A pessoa ou empresa que contrata um servico.',
    'I sent the client an invoice.',
    ARRAY['Freelancing']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Freelancing & Contracts',
    'Vocabulario tecnico para trabalhar como freelancer em ingles',
    'Career',
    'advanced',
    18
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Defining the Scope', 1,
    'Before starting, I made sure the scope of the project was clear.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Setting a Deadline', 2,
    'We agreed on a deadline that gave me enough buffer time.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Sending an Invoice', 3,
    'At the end of the month, I sent the client an invoice.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Handling Scope Creep', 4,
    'When the client asked for extra features, I explained that was scope creep.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Renewing the Contract', 5,
    'Since the project went well, we renewed the contract for another quarter.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'scope', id FROM ch1
UNION ALL SELECT 'deadline', id FROM ch2
UNION ALL SELECT 'client', id FROM ch3
UNION ALL SELECT 'invoice', id FROM ch3
UNION ALL SELECT 'client', id FROM ch4
UNION ALL SELECT 'scope', id FROM ch4;

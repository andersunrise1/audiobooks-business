INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'salary',
    'substantivo',
    'Salario',
    'A quantia paga a um funcionario pelo seu trabalho.',
    'I received an offer with a lower salary.',
    ARRAY['Career']
  ),
  (
    'counteroffer',
    'substantivo',
    'Contraproposta',
    'Uma nova proposta feita em resposta a uma oferta inicial, geralmente pedindo condicoes melhores.',
    'I sent a counteroffer asking for a higher salary.',
    ARRAY['Career']
  ),
  (
    'remote',
    'adjetivo',
    'Remoto',
    'Que pode ser feito de qualquer lugar, sem precisar estar no escritorio.',
    'I asked if the role could be fully remote.',
    ARRAY['Career', 'Remote Work']
  ),
  (
    'negotiation',
    'substantivo',
    'Negociacao',
    'O processo de conversar para chegar a um acordo que atenda ambas as partes.',
    'After a short negotiation, we agreed on a package.',
    ARRAY['Career']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Negotiating a Job Offer',
    'Vocabulario tecnico para negociar salario e condicoes de trabalho em ingles',
    'Career',
    'advanced',
    18
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Receiving the Offer', 1,
    'I received an offer with a salary a bit lower than I expected.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Doing Research', 2,
    'Before responding, I researched the average salary for this role.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Making a Counteroffer', 3,
    'I sent a counteroffer asking for a higher salary and more vacation days.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Discussing Remote Work', 4,
    'I also asked if the role could be fully remote.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Accepting the Offer', 5,
    'After a short negotiation, we agreed on a package I was happy with.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'salary', id FROM ch1
UNION ALL SELECT 'salary', id FROM ch2
UNION ALL SELECT 'counteroffer', id FROM ch3
UNION ALL SELECT 'remote', id FROM ch4
UNION ALL SELECT 'negotiation', id FROM ch5;

INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'query',
    'substantivo',
    'Consulta (banco de dados)',
    'Uma instrucao usada para buscar ou manipular dados em um banco de dados.',
    'I wrote a query to fetch all orders.',
    ARRAY['Database']
  ),
  (
    'bottleneck',
    'substantivo',
    'Gargalo',
    'A parte de um sistema que limita o desempenho geral.',
    'We profiled the code to find the bottleneck.',
    ARRAY['Performance']
  ),
  (
    'index',
    'substantivo',
    'Indice',
    'Uma estrutura no banco de dados que acelera a busca por dados especificos.',
    'We added an index on the email column.',
    ARRAY['Database']
  ),
  (
    'migration',
    'substantivo',
    'Migracao (banco de dados)',
    'Uma alteracao controlada na estrutura do banco de dados.',
    'We ran a migration to add the new column.',
    ARRAY['Database']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Database & Performance',
    'Vocabulario tecnico para consultas, indices e migracoes de banco de dados',
    'Software Engineering',
    'advanced',
    18
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Writing the Query', 1,
    'I wrote a query to fetch all orders from the last thirty days.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Finding the Bottleneck', 2,
    'The page was slow, so we profiled the code to find the bottleneck.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Adding an Index', 3,
    'We added an index on the email column to speed up lookups.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'The N+1 Problem', 4,
    'Our code was making one query per row, a classic N+1 problem.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Running a Migration', 5,
    'We ran a migration to add the new column safely, without downtime.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'query', id FROM ch1
UNION ALL SELECT 'bottleneck', id FROM ch2
UNION ALL SELECT 'index', id FROM ch3
UNION ALL SELECT 'query', id FROM ch4
UNION ALL SELECT 'migration', id FROM ch5;

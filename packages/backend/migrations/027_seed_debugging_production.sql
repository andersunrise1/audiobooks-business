INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'logs',
    'substantivo',
    'Logs',
    'Registros gerados pelo sistema que mostram o que aconteceu durante a execucao do codigo.',
    'I checked the logs and found an error.',
    ARRAY['Debugging']
  ),
  (
    'stack trace',
    'substantivo',
    'Stack trace (pilha de execucao)',
    'A sequencia de chamadas de funcao que levou a um erro, usada para encontrar sua origem.',
    'The stack trace pointed to a null value.',
    ARRAY['Debugging']
  ),
  (
    'breakpoint',
    'substantivo',
    'Breakpoint (ponto de parada)',
    'Um ponto no codigo onde a execucao para, para que o desenvolvedor possa inspecionar o estado do programa.',
    'I added a breakpoint to inspect the variables.',
    ARRAY['Debugging']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Debugging in Production',
    'Vocabulario tecnico para investigar e corrigir bugs em producao em ingles',
    'Software Engineering',
    'advanced',
    15
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Reproducing the Bug', 1,
    'I tried to reproduce the bug locally, but it only happened in production.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Reading the Logs', 2,
    'I checked the logs and found an error I hadn''t seen before.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Finding the Stack Trace', 3,
    'The stack trace pointed to a null value in the payment function.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Adding a Breakpoint', 4,
    'I added a breakpoint to inspect the variables at that exact moment.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Shipping a Fix', 5,
    'Once I understood the cause, I shipped a small, safe fix.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'bug', id FROM ch1
UNION ALL SELECT 'logs', id FROM ch2
UNION ALL SELECT 'stack trace', id FROM ch3
UNION ALL SELECT 'breakpoint', id FROM ch4;

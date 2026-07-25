INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'queue',
    'substantivo',
    'Fila',
    'Uma estrutura que armazena tarefas para serem processadas em ordem, geralmente de forma assincrona.',
    'I proposed using a queue instead of calling the service directly.',
    ARRAY['Architecture']
  ),
  (
    'consensus',
    'substantivo',
    'Consenso',
    'Um acordo geral alcancado apos discussao entre os membros de um time.',
    'We discussed it as a team until we reached consensus.',
    ARRAY['Architecture', 'Team']
  ),
  (
    'scalability',
    'substantivo',
    'Escalabilidade',
    'A capacidade de um sistema de lidar com o crescimento de uso sem perder desempenho.',
    'Every option had a trade-off between simplicity and scalability.',
    ARRAY['Architecture', 'Performance']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Architecture Decisions',
    'Vocabulario tecnico para debater e documentar decisoes de arquitetura em ingles',
    'Software Engineering',
    'advanced',
    18
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Proposing an Approach', 1,
    'I proposed using a queue instead of calling the service directly.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Weighing the Trade-off', 2,
    'Every option had a trade-off between simplicity and scalability.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Getting Consensus', 3,
    'We discussed it as a team until we reached consensus.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Documenting the Decision', 4,
    'I wrote the decision down so future engineers would understand why.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Revisiting Later', 5,
    'Six months later, we revisited the decision and it still held up.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'queue', id FROM ch1
UNION ALL SELECT 'trade-off', id FROM ch2
UNION ALL SELECT 'scalability', id FROM ch2
UNION ALL SELECT 'consensus', id FROM ch3;

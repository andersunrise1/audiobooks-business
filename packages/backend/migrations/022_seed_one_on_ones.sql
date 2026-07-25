INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'goals',
    'substantivo',
    'Metas',
    'Objetivos concretos que se pretende alcancar em um periodo definido.',
    'We agreed on two concrete goals.',
    ARRAY['Career']
  ),
  (
    'performance review',
    'substantivo',
    'Avaliacao de desempenho',
    'Uma avaliacao formal e periodica do trabalho de um funcionario.',
    'My performance review highlighted my strengths.',
    ARRAY['Career']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    '1:1s & Performance Reviews',
    'Vocabulario tecnico para conversas de carreira com o gestor em ingles',
    'Career',
    'intermediate',
    15
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Preparing for the 1:1', 1,
    'Before my 1:1, I wrote down three topics I wanted to discuss with my manager.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Giving Feedback Upward', 2,
    'I told my manager that clearer priorities would help me plan my week.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Discussing Growth', 3,
    'We talked about what skills I need to grow into a senior role.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Setting Goals', 4,
    'We agreed on two concrete goals for the next quarter.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Performance Review', 5,
    'My performance review highlighted my strengths and one area to improve.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'priorities', id FROM ch2
UNION ALL SELECT 'goals', id FROM ch4
UNION ALL SELECT 'performance review', id FROM ch5;

INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'impact',
    'substantivo',
    'Impacto',
    'O efeito real e mensuravel que um trabalho teve.',
    'I started tracking my impact.',
    ARRAY['Career']
  ),
  (
    'ownership',
    'substantivo',
    'Responsabilidade/protagonismo',
    'Assumir total responsabilidade por um projeto ou resultado, do inicio ao fim.',
    'I gathered evidence from projects where I took ownership.',
    ARRAY['Career']
  ),
  (
    'promotion',
    'substantivo',
    'Promocao',
    'Uma mudanca para um cargo de maior nivel ou responsabilidade.',
    'I was interested in a promotion this cycle.',
    ARRAY['Career']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Building a Promotion Case',
    'Vocabulario tecnico para construir um caso de promocao em ingles',
    'Career',
    'advanced',
    18
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Tracking Your Impact', 1,
    'I started tracking my impact so I''d have real examples later.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Gathering Evidence', 2,
    'I gathered evidence from projects where I took ownership.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Talking to Your Manager', 3,
    'I told my manager I was interested in a promotion this cycle.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Making the Case', 4,
    'I made the case using specific examples, not vague statements.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Handling the Outcome', 5,
    'Whatever the outcome, I asked for clear feedback on what to improve next.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'impact', id FROM ch1
UNION ALL SELECT 'ownership', id FROM ch2
UNION ALL SELECT 'promotion', id FROM ch3
UNION ALL SELECT 'feedback', id FROM ch5;

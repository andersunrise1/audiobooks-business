INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'new hire',
    'substantivo',
    'Novo contratado',
    'Uma pessoa que acabou de ser contratada pela empresa.',
    'I gave the new hire a tour of the codebase.',
    ARRAY['Career', 'Onboarding']
  ),
  (
    'environment',
    'substantivo',
    'Ambiente (de desenvolvimento)',
    'O conjunto de ferramentas e configuracoes necessarias para rodar o codigo.',
    'We spent the morning setting up their local environment.',
    ARRAY['Software Engineering']
  ),
  (
    'paired',
    'verbo',
    'Trabalhou em par',
    'Forma no passado de "pair": trabalhar em conjunto com outra pessoa no mesmo codigo, ao mesmo tempo.',
    'I paired with them on a small bug.',
    ARRAY['Software Engineering']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Onboarding a New Developer',
    'Vocabulario tecnico para integrar um novo desenvolvedor ao time em ingles',
    'Career',
    'beginner',
    15
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Welcoming the New Hire', 1,
    'On their first day, I gave the new hire a tour of the codebase.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Explaining the Architecture', 2,
    'I walked them through the architecture and how the services talk to each other.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Setting Up the Environment', 3,
    'We spent the morning setting up their local environment.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Pairing on a Task', 4,
    'I paired with them on a small bug to show how we work.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Checking In', 5,
    'At the end of the week, I checked in to see how they were adjusting.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'new hire', id FROM ch1
UNION ALL SELECT 'architecture', id FROM ch2
UNION ALL SELECT 'environment', id FROM ch3
UNION ALL SELECT 'paired', id FROM ch4
UNION ALL SELECT 'bug', id FROM ch4;

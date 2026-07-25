INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'feedback',
    'substantivo',
    'Feedback/retorno',
    'Uma opiniao ou avaliacao sobre o trabalho de alguem, com o objetivo de ajudar a melhorar.',
    'I asked a teammate for feedback.',
    ARRAY['Code Review', 'Career']
  ),
  (
    'bug',
    'substantivo',
    'Bug/erro',
    'Um erro ou defeito no codigo que causa um comportamento inesperado.',
    'The change could cause a bug.',
    ARRAY['Software Engineering']
  ),
  (
    'constructive',
    'adjetivo',
    'Construtivo',
    'Que tem a intencao de ajudar a melhorar, em vez de apenas criticar.',
    'I try to stay constructive.',
    ARRAY['Code Review']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Code Review Etiquette',
    'Vocabulario tecnico para dar e receber feedback em revisoes de codigo',
    'Software Engineering',
    'intermediate',
    15
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Requesting a Review', 1,
    'I opened a pull request and asked a teammate for feedback.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Being Specific', 2,
    'Instead of saying this is wrong, I explained exactly why the change could cause a bug.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Staying Objective', 3,
    'I try to review the code, not the person, and stay constructive.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Receiving Feedback', 4,
    'When my code gets criticized, I remind myself it''s about the code, not me.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Approving Changes', 5,
    'Once everything looked good, I approved the pull request.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'pull request', id FROM ch1
UNION ALL SELECT 'feedback', id FROM ch1
UNION ALL SELECT 'bug', id FROM ch2
UNION ALL SELECT 'constructive', id FROM ch3
UNION ALL SELECT 'pull request', id FROM ch5;

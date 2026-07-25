INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES (
  'reviewed',
  'verbo',
  'Revisado',
  'Forma no passado de "review": examinar o codigo de outra pessoa antes de ele ser incorporado ao projeto.',
  'A teammate reviewed my pull request and left a few comments.',
  ARRAY['Git', 'Code Review']
)
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Git & Code Review',
    'Vocabulario tecnico para pull requests, commits e revisao de codigo',
    'Software Engineering',
    'intermediate',
    18
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Starting a New Branch', 1,
    'I created a new branch for the login feature. Before writing any code, I pulled the latest changes from main.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Committing Changes', 2,
    'I made a small commit after fixing the first bug. Each commit message explains exactly what changed and why.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Opening a Pull Request', 3,
    'Once the feature was ready, I opened a pull request. I described the changes and linked the related ticket.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Review and Feedback', 4,
    'A teammate reviewed my pull request and left a few comments. She asked me to refactor one function and add a test.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Merging', 5,
    'After I addressed the feedback, my pull request was approved. I merged the branch into main and deleted it.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'branch', id FROM ch1
UNION ALL SELECT 'commit', id FROM ch2
UNION ALL SELECT 'pull request', id FROM ch3
UNION ALL SELECT 'reviewed', id FROM ch4
UNION ALL SELECT 'refactor', id FROM ch4
UNION ALL SELECT 'merge', id FROM ch5;

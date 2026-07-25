INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'stakeholders',
    'substantivo',
    'Partes interessadas',
    'Pessoas ou grupos com interesse ou influencia sobre o resultado de um projeto.',
    'We demoed the finished features to stakeholders.',
    ARRAY['Agile', 'Business']
  ),
  (
    'retro',
    'substantivo',
    'Retrospectiva',
    'Reuniao ao final de um ciclo de trabalho para discutir o que funcionou bem e o que pode melhorar.',
    'In the retro, we discussed what went well.',
    ARRAY['Agile']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Sprint Planning & Retrospectives',
    'Vocabulario tecnico para planejamento e retrospectivas ageis em ingles',
    'Software Engineering',
    'intermediate',
    18
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Reviewing the Backlog', 1,
    'Before planning, we reviewed the backlog and picked our top priorities.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Estimating Effort', 2,
    'We estimated each ticket using story points instead of hours.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Committing to the Sprint', 3,
    'The team agreed to ten tickets for this sprint.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Sprint Review', 4,
    'At the end of the sprint, we demoed the finished features to stakeholders.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Retrospective', 5,
    'In the retro, we discussed what went well and what we should improve.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'backlog', id FROM ch1
UNION ALL SELECT 'priorities', id FROM ch1
UNION ALL SELECT 'sprint', id FROM ch3
UNION ALL SELECT 'sprint', id FROM ch4
UNION ALL SELECT 'stakeholders', id FROM ch4
UNION ALL SELECT 'retro', id FROM ch5;

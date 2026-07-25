INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'issue',
    'substantivo',
    'Issue (tarefa/problema)',
    'Um problema, tarefa ou sugestao registrada em um sistema de rastreamento, como o GitHub.',
    'I found an issue labeled good first issue.',
    ARRAY['Open Source', 'Git']
  ),
  (
    'forked',
    'verbo',
    'Bifurcou (repositorio)',
    'Forma no passado de "fork": criar uma copia independente de um repositorio para fazer alteracoes.',
    'I forked the repository.',
    ARRAY['Open Source', 'Git']
  ),
  (
    'maintainer',
    'substantivo',
    'Mantenedor',
    'A pessoa responsavel por gerenciar e revisar contribuicoes em um projeto de codigo aberto.',
    'A maintainer asked for a small change.',
    ARRAY['Open Source']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Open Source Contribution',
    'Vocabulario tecnico para contribuir com projetos de codigo aberto em ingles',
    'Software Engineering',
    'intermediate',
    18
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Finding an Issue', 1,
    'I looked through the open issues and found one labeled good first issue.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Forking the Repository', 2,
    'I forked the repository and cloned it to my machine.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Making the Change', 3,
    'I made the change and wrote a test to cover it.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Opening the Pull Request', 4,
    'I opened a pull request explaining what I changed and why.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Responding to Maintainers', 5,
    'A maintainer asked for a small change, so I updated the pull request.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'issue', id FROM ch1
UNION ALL SELECT 'forked', id FROM ch2
UNION ALL SELECT 'pull request', id FROM ch4
UNION ALL SELECT 'maintainer', id FROM ch5
UNION ALL SELECT 'pull request', id FROM ch5;

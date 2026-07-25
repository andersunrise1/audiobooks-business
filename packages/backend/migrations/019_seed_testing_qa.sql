INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'coverage',
    'substantivo',
    'Cobertura de testes',
    'A porcentagem do codigo que e executada pelos testes automatizados.',
    'Our test coverage was low.',
    ARRAY['Testing']
  ),
  (
    'flaky',
    'adjetivo',
    'Instavel (teste)',
    'Um teste que as vezes passa e as vezes falha, sem mudanca no codigo.',
    'This test is flaky.',
    ARRAY['Testing']
  ),
  (
    'mocked',
    'verbo',
    'Simulado/mockado',
    'Forma no passado de "mock": substituir uma dependencia real por uma versao falsa e controlada, geralmente em testes.',
    'We mocked the external API.',
    ARRAY['Testing']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Testing & QA',
    'Vocabulario tecnico para testes automatizados e qualidade de software',
    'Software Engineering',
    'intermediate',
    15
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Writing a Unit Test', 1,
    'I wrote a unit test to check that the function returns the right value.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Increasing Coverage', 2,
    'Our test coverage was low, so we added tests for the edge cases.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'A Flaky Test', 3,
    'This test is flaky, it passes most of the time but fails randomly.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Mocking a Dependency', 4,
    'We mocked the external API so the test doesn''t depend on the network.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'A Green Pipeline', 5,
    'After fixing the last test, the pipeline was finally green.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'coverage', id FROM ch2
UNION ALL SELECT 'flaky', id FROM ch3
UNION ALL SELECT 'mocked', id FROM ch4
UNION ALL SELECT 'pipeline', id FROM ch5;

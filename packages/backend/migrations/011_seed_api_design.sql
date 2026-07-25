WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'API Design',
    'Vocabulario tecnico para endpoints, requisicoes e respostas de API',
    'Software Engineering',
    'intermediate',
    20
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Defining Endpoints', 1,
    'We''re designing a new endpoint to let users update their profile. It should accept a request with only the fields that changed.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Request and Response', 2,
    'The request payload includes the user''s name and email. The response returns the updated profile as JSON.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Choosing a Schema', 3,
    'We agreed on a schema that separates public fields from internal ones. This makes the API easier to document and version.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Versioning and Deprecation', 4,
    'When we change the schema, we release a new API version instead of breaking existing clients. The old endpoint gets deprecated with a clear timeline.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Reliability', 5,
    'We also made the endpoint idempotent, so retrying a failed request never creates duplicate data. A webhook notifies other services when the update succeeds.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'endpoint', id FROM ch1
UNION ALL SELECT 'payload', id FROM ch2
UNION ALL SELECT 'schema', id FROM ch3
UNION ALL SELECT 'deprecate', id FROM ch4
UNION ALL SELECT 'idempotent', id FROM ch5
UNION ALL SELECT 'webhook', id FROM ch5;

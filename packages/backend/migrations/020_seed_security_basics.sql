INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'authentication',
    'substantivo',
    'Autenticacao',
    'O processo de verificar quem um usuario e.',
    'Authentication checks who you are.',
    ARRAY['Security']
  ),
  (
    'authorization',
    'substantivo',
    'Autorizacao',
    'O processo de verificar o que um usuario tem permissao para fazer.',
    'Authorization checks what you''re allowed to do.',
    ARRAY['Security']
  ),
  (
    'vulnerability',
    'substantivo',
    'Vulnerabilidade',
    'Uma falha de seguranca que pode ser explorada por um atacante.',
    'A researcher reported a vulnerability.',
    ARRAY['Security']
  ),
  (
    'encrypt',
    'verbo',
    'Criptografar',
    'Transformar dados em um formato ilegivel para protege-los.',
    'We encrypt passwords before storing them.',
    ARRAY['Security']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Security Basics',
    'Vocabulario tecnico para seguranca de software em ingles',
    'Software Engineering',
    'advanced',
    18
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Authentication vs Authorization', 1,
    'Authentication checks who you are; authorization checks what you''re allowed to do.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'A Vulnerability Report', 2,
    'A researcher reported a vulnerability in our login form.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Encrypting Data', 3,
    'We encrypt passwords before storing them in the database.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Validating Input', 4,
    'Never trust user input, always validate it on the server.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Patching the Issue', 5,
    'We patched the vulnerability and deployed the fix the same day.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'authentication', id FROM ch1
UNION ALL SELECT 'authorization', id FROM ch1
UNION ALL SELECT 'vulnerability', id FROM ch2
UNION ALL SELECT 'encrypt', id FROM ch3
UNION ALL SELECT 'vulnerability', id FROM ch5
UNION ALL SELECT 'deployed', id FROM ch5;

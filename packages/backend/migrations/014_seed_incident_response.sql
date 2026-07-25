INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'root cause',
    'substantivo',
    'Causa raiz',
    'A causa real e original de um problema, nao apenas o sintoma visivel.',
    'First, we checked the dashboards to find the root cause.',
    ARRAY['DevOps', 'Incident Response']
  ),
  (
    'mitigate',
    'verbo',
    'Mitigar',
    'Reduzir o impacto ou a gravidade de um problema, mesmo sem resolve-lo completamente.',
    'We decided to rollback the deployment to mitigate the impact.',
    ARRAY['DevOps', 'Incident Response']
  ),
  (
    'escalated',
    'verbo',
    'Escalado/encaminhado',
    'Forma no passado de "escalate": encaminhar um problema para uma pessoa ou equipe com mais experiencia ou autoridade para resolve-lo.',
    'I escalated the issue to the database team.',
    ARRAY['DevOps', 'Incident Response']
  ),
  (
    'postmortem',
    'substantivo',
    'Post-mortem (analise pos-incidente)',
    'Um documento escrito apos um incidente, explicando o que aconteceu, por que aconteceu, e como evitar que se repita.',
    'We wrote a postmortem explaining what went wrong.',
    ARRAY['DevOps', 'Incident Response']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Incident Response',
    'Vocabulario tecnico para lidar com incidentes de producao em ingles',
    'DevOps',
    'intermediate',
    18
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Detecting the Issue', 1,
    'We got paged at 3 AM because the API was returning errors. I checked my phone and saw the alert immediately.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Triage', 2,
    'First, we checked the dashboards to find the root cause. It looked like the last deployment was causing the failures.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Mitigating', 3,
    'We decided to rollback the deployment to mitigate the impact. The errors stopped within two minutes.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Communicating', 4,
    'I posted an update in the incident channel every fifteen minutes, and escalated to the database team when we needed help.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Postmortem', 5,
    'Two days later, we wrote a postmortem explaining what went wrong and how to prevent it from happening again.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'root cause', id FROM ch2
UNION ALL SELECT 'rollback', id FROM ch3
UNION ALL SELECT 'mitigate', id FROM ch3
UNION ALL SELECT 'escalated', id FROM ch4
UNION ALL SELECT 'postmortem', id FROM ch5;

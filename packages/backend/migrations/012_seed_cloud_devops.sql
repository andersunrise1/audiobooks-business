INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES (
  'instance',
  'substantivo',
  'Instancia',
  'Uma copia individual de um servidor ou servico em execucao, geralmente uma entre varias rodando em paralelo.',
  'Kubernetes restarts the instance if it crashes.',
  ARRAY['Cloud', 'DevOps']
)
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Cloud & DevOps',
    'Vocabulario tecnico para containers, orquestracao e pipelines de deploy',
    'DevOps',
    'intermediate',
    18
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Containers', 1,
    'We packaged the application into a container so it runs the same way everywhere. The container image includes all the dependencies it needs.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Orchestration', 2,
    'In production, the containers run on a cluster managed by Kubernetes. Each service runs as its own instance, and Kubernetes restarts it if it crashes.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Deployment Pipeline', 3,
    'Every push to main triggers our deployment pipeline. It builds the container, runs the tests, and deploys automatically to staging.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Scaling', 4,
    'When traffic increases, the cluster adds more instances to handle the load. This keeps latency low even during peak hours.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Monitoring', 5,
    'We monitor throughput and latency for every service. If something looks wrong, an alert notifies the on-call engineer immediately.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'container', id FROM ch1
UNION ALL SELECT 'cluster', id FROM ch2
UNION ALL SELECT 'instance', id FROM ch2
UNION ALL SELECT 'pipeline', id FROM ch3
UNION ALL SELECT 'staging', id FROM ch3
UNION ALL SELECT 'latency', id FROM ch4
UNION ALL SELECT 'throughput', id FROM ch5;

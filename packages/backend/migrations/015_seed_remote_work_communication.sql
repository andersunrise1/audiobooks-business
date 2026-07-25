INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'async',
    'adjetivo',
    'Assincrono',
    'Que nao acontece em tempo real; comunicacao ou trabalho que nao exige que todos estejam presentes ao mesmo tempo.',
    'I post an async update in Slack instead of joining a live call.',
    ARRAY['Remote Work', 'Communication']
  ),
  (
    'time zone',
    'substantivo',
    'Fuso horario',
    'A regiao do mundo que compartilha o mesmo horario padrao, relevante para times distribuidos.',
    'We scheduled the meeting at a time that works for both time zones.',
    ARRAY['Remote Work']
  ),
  (
    'concise',
    'adjetivo',
    'Conciso',
    'Que comunica uma ideia de forma clara e direta, sem palavras desnecessarias.',
    'I try to write clear, concise messages.',
    ARRAY['Remote Work', 'Communication']
  ),
  (
    'visible',
    'adjetivo',
    'Visivel',
    'Facilmente percebido ou acompanhado por outras pessoas, como o progresso de um trabalho.',
    'I make sure my progress is visible to the team.',
    ARRAY['Remote Work']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Remote Work Communication',
    'Vocabulario tecnico para comunicacao em times remotos e distribuidos',
    'Career',
    'beginner',
    15
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Async Updates', 1,
    'Since we''re in a different time zone, I post an async update in Slack instead of joining a live call.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Written Communication', 2,
    'I try to write clear, concise messages so nobody has to ask follow-up questions.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Timezone Coordination', 3,
    'We scheduled the meeting at a time that works for both teams, even though it''s early morning in my time zone.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Giving Feedback Remotely', 4,
    'I left my comments directly on the pull request instead of waiting for a call.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Staying Visible', 5,
    'Even working async, I make sure my progress is visible to the team by updating the ticket every day.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'async', id FROM ch1
UNION ALL SELECT 'time zone', id FROM ch1
UNION ALL SELECT 'concise', id FROM ch2
UNION ALL SELECT 'time zone', id FROM ch3
UNION ALL SELECT 'pull request', id FROM ch4
UNION ALL SELECT 'async', id FROM ch5
UNION ALL SELECT 'visible', id FROM ch5;

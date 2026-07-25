INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'architecture',
    'substantivo',
    'Arquitetura',
    'A estrutura geral de um sistema de software: como seus componentes sao organizados e se comunicam.',
    'Start by clarifying requirements before you draw the architecture.',
    ARRAY['System Design', 'Interview']
  ),
  (
    'trade-off',
    'substantivo',
    'Compromisso/Troca',
    'Uma decisao de design em que se ganha algo em troca de perder outra coisa, sem uma solucao perfeita.',
    'Every design decision involves a trade-off.',
    ARRAY['System Design', 'Interview']
  ),
  (
    'complexity',
    'substantivo',
    'Complexidade',
    'O quao dificil um sistema ou algoritmo e de entender, manter ou executar.',
    'A cache improves latency but adds complexity.',
    ARRAY['System Design', 'Algorithms']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Interview Preparation',
    'Vocabulario tecnico para entrevistas de emprego em ingles',
    'Career',
    'advanced',
    25
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Introducing Yourself', 1,
    '"Tell me about yourself" is usually the first question. Keep your answer short: your current role, your main skills, and what you''re looking for next.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'System Design Basics', 2,
    'In a system design interview, the interviewer wants to see how you think about architecture. Start by clarifying requirements before you draw any diagram.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Discussing Trade-offs', 3,
    'Every design decision involves a trade-off. For example, a cache improves latency but adds complexity and can serve stale data.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Behavioral Questions', 4,
    'Behavioral questions ask about a real situation you faced. Describe the context, the action you took, and the result, briefly and honestly.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Asking Questions', 5,
    'At the end of the interview, ask thoughtful questions about the team and the codebase. It shows genuine interest, not just memorized answers.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'architecture', id FROM ch2
UNION ALL SELECT 'trade-off', id FROM ch3
UNION ALL SELECT 'complexity', id FROM ch3
UNION ALL SELECT 'latency', id FROM ch3;

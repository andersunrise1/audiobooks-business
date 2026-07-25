INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'elevator pitch',
    'substantivo',
    'Discurso rapido de apresentacao',
    'Uma explicacao curta e persuasiva sobre um projeto ou ideia, curta o suficiente para caber em uma viagem de elevador.',
    'I practiced a short elevator pitch about my project.',
    ARRAY['Networking']
  ),
  (
    'contacts',
    'substantivo',
    'Contatos',
    'Informacoes de pessoas conhecidas profissionalmente, usadas para manter contato no futuro.',
    'We exchanged contacts to stay in touch.',
    ARRAY['Networking']
  )
ON CONFLICT (word) DO NOTHING;

WITH book AS (
  INSERT INTO audiobooks (title, description, category, level, duration_minutes)
  VALUES (
    'Networking at Tech Events',
    'Vocabulario tecnico para conversar e fazer contatos em eventos de tecnologia em ingles',
    'Career',
    'beginner',
    15
  )
  RETURNING id
),
ch1 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Introducing Yourself', 1,
    'I introduced myself and gave a short summary of what I work on.'
  FROM book
  RETURNING id
),
ch2 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Making Small Talk', 2,
    'We made small talk about the conference before getting into technical topics.'
  FROM book
  RETURNING id
),
ch3 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Giving Your Elevator Pitch', 3,
    'I practiced a short elevator pitch about my project.'
  FROM book
  RETURNING id
),
ch4 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Exchanging Contacts', 4,
    'Before leaving, we exchanged contacts to stay in touch.'
  FROM book
  RETURNING id
),
ch5 AS (
  INSERT INTO chapters (audiobook_id, title, order_index, transcript)
  SELECT id, 'Following Up After', 5,
    'The next day, I sent a short follow up message.'
  FROM book
  RETURNING id
)
INSERT INTO words (word, chapter_id)
SELECT 'elevator pitch', id FROM ch3
UNION ALL SELECT 'contacts', id FROM ch4
UNION ALL SELECT 'follow up', id FROM ch5;

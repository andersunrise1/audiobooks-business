-- Two words tagged in migrations 010/011 (Dia 42) used the dictionary's base
-- form ('merge', 'deprecate') while their chapter's transcript actually uses
-- a different inflection ('merged', 'deprecated') - TranscriptDisplay
-- matches by exact normalized text, so these were silently never clickable.
-- Found via a verification script cross-checking every tagged word against
-- its own transcript (Dia 46 content batch).
INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
VALUES
  (
    'merged',
    'verbo',
    'Mesclado',
    'Forma no passado de "merge": combinar as alteracoes de uma branch com outra no controle de versao.',
    'I merged the branch into main.',
    ARRAY['Git', 'Code Review']
  ),
  (
    'deprecated',
    'adjetivo',
    'Descontinuado',
    'Forma no passado de "deprecate": marcado como obsoleto, indicando que sera removido no futuro.',
    'This endpoint is deprecated; use v2 instead.',
    ARRAY['API']
  )
ON CONFLICT (word) DO NOTHING;

UPDATE words SET word = 'merged'
WHERE word = 'merge'
AND chapter_id IN (
  SELECT c.id FROM chapters c
  JOIN audiobooks a ON a.id = c.audiobook_id
  WHERE a.title = 'Git & Code Review' AND c.title = 'Merging'
);

UPDATE words SET word = 'deprecated'
WHERE word = 'deprecate'
AND chapter_id IN (
  SELECT c.id FROM chapters c
  JOIN audiobooks a ON a.id = c.audiobook_id
  WHERE a.title = 'API Design' AND c.title = 'Versioning and Deprecation'
);

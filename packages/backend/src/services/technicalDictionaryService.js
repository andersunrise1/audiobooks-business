import { pool } from '../config/database.js';

export async function lookupWord(word) {
  const { rows } = await pool.query(
    `SELECT word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts
     FROM technical_dictionary
     WHERE lower(word) = lower($1)`,
    [word],
  );

  return rows[0] ?? null;
}

// Dia [current]: click-any-word-to-translate generates entries for words
// outside the ~90 curated ones - saving them here (not just on the one
// chapter's `words` row) means the next chapter that happens to use the
// same word gets a free, instant dictionary hit instead of a second AI
// call. ON CONFLICT DO NOTHING since another concurrent click could be
// resolving the exact same word at the same time.
export async function insertDictionaryEntry({
  word,
  partOfSpeech,
  portugueseTranslation,
  technicalExplanation,
  exampleSentence,
}) {
  await pool.query(
    `INSERT INTO technical_dictionary (word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts)
     VALUES ($1, $2, $3, $4, $5, ARRAY[]::text[])
     ON CONFLICT (word) DO NOTHING`,
    [word, partOfSpeech, portugueseTranslation, technicalExplanation, exampleSentence],
  );
}

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

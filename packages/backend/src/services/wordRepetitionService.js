import { pool } from '../config/database.js';

// Words the user has struggled with (clicked more than once, anywhere) that
// also show up in this specific chapter - i.e. a hard word resurfacing in a
// later chapter. Matched by word text (case-insensitive), since the same
// word gets a distinct `words` row per chapter it appears in.
export async function findRepeatedDifficultWords(userId, chapterId) {
  const { rows } = await pool.query(
    `SELECT w.id AS word_id, w.word, count(*) AS click_count
     FROM words w
     JOIN words same_text ON lower(same_text.word) = lower(w.word)
     JOIN word_clicks wc ON wc.word_id = same_text.id AND wc.user_id = $1
     WHERE w.chapter_id = $2
     GROUP BY w.id, w.word
     HAVING count(*) > 1
     ORDER BY click_count DESC, w.word ASC`,
    [userId, chapterId],
  );

  return rows.map((row) => ({
    wordId: row.word_id,
    word: row.word,
    previousClickCount: Number(row.click_count),
  }));
}

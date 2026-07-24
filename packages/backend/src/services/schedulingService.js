import { pool } from '../config/database.js';

// Ranks the user's non-mastered flashcards by how urgently they need
// review: words they've struggled with the most (highest click_count) come
// first, then by SRS due-ness (never-reviewed/most-overdue next). This is
// an intentional departure from plain SM-2 ordering (Dia 17), which only
// looks at next_review - a word clicked 5 times but not due for 3 days
// still needs more attention than one clicked once and due today.
export async function getStudyPriority(userId, limit = 20) {
  const { rows } = await pool.query(
    `SELECT f.id, f.word_id, f.learning_status, f.ease_factor, f.interval_days,
            f.review_count, f.last_reviewed, f.next_review,
            w.word, w.portuguese_translation, w.technical_explanation, w.example_sentence,
            COALESCE(wc.click_count, 0) AS click_count
     FROM flashcards f
     JOIN words w ON w.id = f.word_id
     LEFT JOIN (
       SELECT word_id, count(*) AS click_count
       FROM word_clicks
       WHERE user_id = $1
       GROUP BY word_id
     ) wc ON wc.word_id = f.word_id
     WHERE f.user_id = $1 AND f.learning_status != 'mastered'
     ORDER BY COALESCE(wc.click_count, 0) DESC, f.next_review ASC NULLS FIRST
     LIMIT $2`,
    [userId, limit],
  );

  return rows.map((row) => ({
    id: row.id,
    wordId: row.word_id,
    word: row.word,
    portugueseTranslation: row.portuguese_translation,
    technicalExplanation: row.technical_explanation,
    exampleSentence: row.example_sentence,
    learningStatus: row.learning_status,
    easeFactor: Number(row.ease_factor),
    intervalDays: row.interval_days,
    reviewCount: row.review_count,
    lastReviewed: row.last_reviewed,
    nextReview: row.next_review,
    clickCount: Number(row.click_count),
  }));
}

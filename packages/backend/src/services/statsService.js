import { pool } from '../config/database.js';

/**
 * Given a set of 'YYYY-MM-DD' activity dates, returns the current streak
 * length in days, counting back from today (or yesterday, if today has no
 * activity yet — the streak isn't broken until the day is over).
 */
export function computeStreakDays(activityDates) {
  const dateSet = new Set(activityDates);

  const toKey = (date) => date.toISOString().slice(0, 10);

  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);

  if (!dateSet.has(toKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!dateSet.has(toKey(cursor))) return 0;
  }

  let streak = 0;
  while (dateSet.has(toKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

export async function getUserStats(userId) {
  // Dia 73-74: word_clicks day/week/month counts and the distinct activity
  // dates used for the streak both scan the same table with the same
  // user_id filter - merged into one query (was two) so this endpoint
  // needs 4 simultaneous pool connections instead of 5. EXPLAIN ANALYZE
  // confirmed the query itself was never the slow part (sub-millisecond on
  // this dataset); this only helps by reducing how many of the pool's
  // connections one request holds at once under concurrent load.
  const [wordsResult, flashcardsResult, timeResult, audiobooksResult] = await Promise.all([
    pool.query(
      `SELECT
         count(DISTINCT word_id) FILTER (WHERE created_at >= date_trunc('day', now())) AS today,
         count(DISTINCT word_id) FILTER (WHERE created_at >= date_trunc('week', now())) AS week,
         count(DISTINCT word_id) FILTER (WHERE created_at >= date_trunc('month', now())) AS month,
         array_agg(DISTINCT to_char(created_at, 'YYYY-MM-DD')) FILTER (WHERE created_at IS NOT NULL) AS activity_dates
       FROM word_clicks
       WHERE user_id = $1`,
      [userId],
    ),
    pool.query(
      `SELECT count(*) AS due
       FROM flashcards
       WHERE user_id = $1 AND (next_review IS NULL OR next_review <= now())`,
      [userId],
    ),
    pool.query(
      `SELECT COALESCE(SUM(c.duration_seconds * up.listening_count), 0) AS total_seconds
       FROM user_progress up
       JOIN chapters c ON c.id = up.chapter_id
       WHERE up.user_id = $1`,
      [userId],
    ),
    pool.query(
      `SELECT a.id AS audiobook_id, a.title,
              count(DISTINCT up.chapter_id) AS chapters_started,
              count(DISTINCT c.id) AS chapters_total
       FROM audiobooks a
       JOIN chapters c ON c.audiobook_id = a.id
       JOIN user_progress up ON up.chapter_id = c.id AND up.user_id = $1
       GROUP BY a.id, a.title
       ORDER BY a.title`,
      [userId],
    ),
  ]);

  const streakDays = computeStreakDays(wordsResult.rows[0].activity_dates ?? []);

  return {
    wordsLearned: {
      today: Number(wordsResult.rows[0].today),
      week: Number(wordsResult.rows[0].week),
      month: Number(wordsResult.rows[0].month),
    },
    flashcardsDue: Number(flashcardsResult.rows[0].due),
    totalStudyMinutes: Math.round(Number(timeResult.rows[0].total_seconds) / 60),
    streakDays,
    audiobooksInProgress: audiobooksResult.rows.map((row) => ({
      audiobookId: row.audiobook_id,
      title: row.title,
      chaptersStarted: Number(row.chapters_started),
      chaptersTotal: Number(row.chapters_total),
    })),
  };
}

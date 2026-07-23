import { pool } from '../config/database.js';
import { computeStreakDays } from '../services/statsService.js';

export async function getUserStats(req, res) {
  const userId = req.user.id;

  const [wordsResult, flashcardsResult, timeResult, streakResult, audiobooksResult] =
    await Promise.all([
      pool.query(
        `SELECT
           count(DISTINCT word_id) FILTER (WHERE created_at >= date_trunc('day', now())) AS today,
           count(DISTINCT word_id) FILTER (WHERE created_at >= date_trunc('week', now())) AS week,
           count(DISTINCT word_id) FILTER (WHERE created_at >= date_trunc('month', now())) AS month
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
        `SELECT DISTINCT to_char(created_at, 'YYYY-MM-DD') AS activity_date
         FROM word_clicks
         WHERE user_id = $1`,
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

  const streakDays = computeStreakDays(streakResult.rows.map((row) => row.activity_date));

  res.json({
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
  });
}

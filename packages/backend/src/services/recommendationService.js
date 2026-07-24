import { pool } from '../config/database.js';

// Continue where the user left off: the lowest order_index, not-yet-completed
// chapter in the audiobook they most recently interacted with.
export async function getNextChapterRecommendation(userId) {
  const { rows: recentRows } = await pool.query(
    `SELECT a.id AS audiobook_id, a.title AS audiobook_title
     FROM user_progress up
     JOIN chapters c ON c.id = up.chapter_id
     JOIN audiobooks a ON a.id = c.audiobook_id
     WHERE up.user_id = $1
     ORDER BY up.last_accessed DESC NULLS LAST
     LIMIT 1`,
    [userId],
  );

  const recent = recentRows[0];
  if (!recent) return null;

  const { rows: chapterRows } = await pool.query(
    `SELECT c.id AS chapter_id, c.title AS chapter_title, c.order_index
     FROM chapters c
     LEFT JOIN user_progress up ON up.chapter_id = c.id AND up.user_id = $1
     WHERE c.audiobook_id = $2 AND (up.completed IS NULL OR up.completed = false)
     ORDER BY c.order_index ASC
     LIMIT 1`,
    [userId, recent.audiobook_id],
  );

  const nextChapter = chapterRows[0];
  if (!nextChapter) return null; // every chapter in this audiobook is already completed

  return {
    audiobookId: recent.audiobook_id,
    audiobookTitle: recent.audiobook_title,
    chapterId: nextChapter.chapter_id,
    chapterTitle: nextChapter.chapter_title,
    orderIndex: nextChapter.order_index,
  };
}

// An audiobook the user hasn't started yet, preferring the category/level
// they've engaged with the most so far (falls back to any unstarted one).
export async function getRecommendedAudiobook(userId) {
  const { rows: preferenceRows } = await pool.query(
    `SELECT a.category, a.level, count(*) AS engagement
     FROM user_progress up
     JOIN chapters c ON c.id = up.chapter_id
     JOIN audiobooks a ON a.id = c.audiobook_id
     WHERE up.user_id = $1
     GROUP BY a.category, a.level
     ORDER BY engagement DESC
     LIMIT 1`,
    [userId],
  );
  const preference = preferenceRows[0] ?? null;

  const { rows } = await pool.query(
    `SELECT a.id, a.title, a.category, a.level
     FROM audiobooks a
     WHERE a.id NOT IN (
       SELECT DISTINCT c.audiobook_id
       FROM user_progress up
       JOIN chapters c ON c.id = up.chapter_id
       WHERE up.user_id = $1
     )
     ORDER BY COALESCE(a.category = $2 AND a.level = $3, false) DESC, a.created_at DESC
     LIMIT 1`,
    [userId, preference?.category ?? null, preference?.level ?? null],
  );

  const audiobook = rows[0];
  if (!audiobook) return null;

  return {
    audiobookId: audiobook.id,
    title: audiobook.title,
    category: audiobook.category,
    level: audiobook.level,
    matchesPreference: Boolean(
      preference &&
      audiobook.category === preference.category &&
      audiobook.level === preference.level,
    ),
  };
}

// Hour of day (0-23, server/DB timezone - no per-user timezone tracking
// exists yet) with the most word_clicks activity historically.
export async function getBestStudyHour(userId) {
  const { rows } = await pool.query(
    `SELECT extract(hour from created_at)::int AS hour, count(*) AS activity_count
     FROM word_clicks
     WHERE user_id = $1
     GROUP BY hour
     ORDER BY activity_count DESC, hour ASC
     LIMIT 1`,
    [userId],
  );

  const top = rows[0];
  if (!top) return null;

  return { hour: top.hour, activityCount: Number(top.activity_count) };
}

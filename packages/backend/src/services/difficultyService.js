import { pool } from '../config/database.js';

// Words this user has clicked more than once - a click on the same word
// repeatedly is a decent proxy for "this word is hard for this user".
export async function getStruggledWords(userId, limit = 10) {
  const { rows } = await pool.query(
    `SELECT w.id AS word_id, w.word, count(*) AS click_count
     FROM word_clicks wc
     JOIN words w ON w.id = wc.word_id
     WHERE wc.user_id = $1
     GROUP BY w.id, w.word
     HAVING count(*) > 1
     ORDER BY click_count DESC, w.word ASC
     LIMIT $2`,
    [userId, limit],
  );

  return rows.map((row) => ({
    wordId: row.word_id,
    word: row.word,
    clickCount: Number(row.click_count),
  }));
}

// Chapters with the lowest completion rate across every user who has
// started them - a content-level signal ("this chapter is hard for
// everyone"), not specific to any one user.
export async function getLowCompletionChapters(limit = 10) {
  const { rows } = await pool.query(
    `SELECT c.id AS chapter_id, c.title,
            count(*) FILTER (WHERE up.completed) AS completed_count,
            count(*) AS attempted_count
     FROM chapters c
     JOIN user_progress up ON up.chapter_id = c.id
     GROUP BY c.id, c.title
     HAVING count(*) >= 1
     ORDER BY (count(*) FILTER (WHERE up.completed))::float / count(*) ASC, c.title ASC
     LIMIT $1`,
    [limit],
  );

  return rows.map((row) => ({
    chapterId: row.chapter_id,
    title: row.title,
    completedCount: Number(row.completed_count),
    attemptedCount: Number(row.attempted_count),
    completionRate: Number(row.completed_count) / Number(row.attempted_count),
  }));
}

// Chapters this user has asked the tutor about the most - a proxy for
// "topics this user has frequent doubts about".
export async function getFrequentQuestionChapters(userId, limit = 10) {
  const { rows } = await pool.query(
    `SELECT c.id AS chapter_id, c.title, count(*) AS question_count
     FROM chat_messages cm
     JOIN chapters c ON c.id = cm.chapter_id
     WHERE cm.user_id = $1
     GROUP BY c.id, c.title
     ORDER BY question_count DESC, c.title ASC
     LIMIT $2`,
    [userId, limit],
  );

  return rows.map((row) => ({
    chapterId: row.chapter_id,
    title: row.title,
    questionCount: Number(row.question_count),
  }));
}

import { pool } from '../config/database.js';

export async function getProgress(req, res) {
  const { rows } = await pool.query('SELECT * FROM user_progress WHERE user_id = $1', [
    req.user.id,
  ]);
  res.json(rows);
}

export async function upsertProgress(req, res) {
  const { chapterId } = req.params;
  const { wordsLearned, listeningCount, completed } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO user_progress (user_id, chapter_id, words_learned, listening_count, completed, last_accessed)
     VALUES ($1, $2, COALESCE($3, 0), COALESCE($4, 0), COALESCE($5, false), now())
     ON CONFLICT (user_id, chapter_id) DO UPDATE SET
       words_learned = COALESCE($3, user_progress.words_learned),
       listening_count = COALESCE($4, user_progress.listening_count),
       completed = COALESCE($5, user_progress.completed),
       last_accessed = now()
     RETURNING *`,
    [req.user.id, chapterId, wordsLearned, listeningCount, completed],
  );

  res.json(rows[0]);
}

export async function saveWordClick(req, res) {
  const { chapterId, wordId } = req.body;

  if (!chapterId || !wordId) {
    return res.status(400).json({ error: 'chapterId and wordId are required' });
  }

  await pool.query(
    'INSERT INTO word_clicks (user_id, word_id, chapter_id) VALUES ($1, $2, $3)',
    [req.user.id, wordId, chapterId],
  );

  await pool.query(
    `INSERT INTO flashcards (user_id, word_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, word_id) DO NOTHING`,
    [req.user.id, wordId],
  );

  const { rows } = await pool.query(
    `INSERT INTO user_progress (user_id, chapter_id, words_learned, last_accessed)
     VALUES ($1, $2, 1, now())
     ON CONFLICT (user_id, chapter_id) DO UPDATE SET
       words_learned = user_progress.words_learned + 1,
       last_accessed = now()
     RETURNING *`,
    [req.user.id, chapterId],
  );

  res.status(201).json(rows[0]);
}

export async function getFlashcards(req, res) {
  const { rows } = await pool.query(
    `SELECT f.*, w.word, w.portuguese_translation, w.technical_explanation, w.example_sentence
     FROM flashcards f
     JOIN words w ON w.id = f.word_id
     WHERE f.user_id = $1
     ORDER BY f.next_review ASC NULLS FIRST`,
    [req.user.id],
  );
  res.json(rows);
}

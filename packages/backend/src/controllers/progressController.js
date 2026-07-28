import { pool } from '../config/database.js';
import { applySm2 } from '../services/srsService.js';

export async function getProgress(req, res) {
  const { rows } = await pool.query('SELECT * FROM user_progress WHERE user_id = $1', [
    req.user.id,
  ]);
  res.json(rows);
}

// Dia 61-62: conflict resolution for offline sync. A queued update from a
// device that was offline can carry a stale wordsLearned/listeningCount
// (computed before the offline period) or arrive after a different device
// already pushed a higher value - a plain overwrite would silently regress
// these counters. GREATEST/OR merges them monotonically instead: an update
// can only move a counter forward or leave it unchanged, never backward.
// This is the single source of truth for the merge, so every caller (web,
// desktop's queued sync push, a second browser tab) gets the same
// conflict-free behavior with no client-side merge logic needed.
export async function upsertProgress(req, res) {
  const { chapterId } = req.params;
  const { wordsLearned, listeningCount, completed } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO user_progress (user_id, chapter_id, words_learned, listening_count, completed, last_accessed)
     VALUES ($1, $2, COALESCE($3, 0), COALESCE($4, 0), COALESCE($5, false), now())
     ON CONFLICT (user_id, chapter_id) DO UPDATE SET
       words_learned = GREATEST(COALESCE($3, 0), user_progress.words_learned),
       listening_count = GREATEST(COALESCE($4, 0), user_progress.listening_count),
       completed = user_progress.completed OR COALESCE($5, false),
       last_accessed = now()
     RETURNING *`,
    [req.user.id, chapterId, wordsLearned, listeningCount, completed],
  );

  res.json(rows[0]);
}

// Dia 78-79: word_clicks/flashcards/user_progress are 3 separate writes
// describing a single logical event ("the user clicked this word") - if any
// later write failed, an earlier one had already committed on its own,
// leaving e.g. a word_clicks row with no matching progress update. Wrapped
// in a transaction (same pattern as adminAudiobookController.js) so the
// whole click is atomic: all 3 rows land, or none do.
export async function saveWordClick(req, res) {
  const { chapterId, wordId } = req.body;

  if (!chapterId || !wordId) {
    return res.status(400).json({ error: 'chapterId and wordId are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'INSERT INTO word_clicks (user_id, word_id, chapter_id) VALUES ($1, $2, $3)',
      [req.user.id, wordId, chapterId],
    );

    await client.query(
      `INSERT INTO flashcards (user_id, word_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, word_id) DO NOTHING`,
      [req.user.id, wordId],
    );

    const { rows } = await client.query(
      `INSERT INTO user_progress (user_id, chapter_id, words_learned, last_accessed)
       VALUES ($1, $2, 1, now())
       ON CONFLICT (user_id, chapter_id) DO UPDATE SET
         words_learned = user_progress.words_learned + 1,
         last_accessed = now()
       RETURNING *`,
      [req.user.id, chapterId],
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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

export async function reviewFlashcard(req, res) {
  const { id } = req.params;
  const { quality } = req.body;

  if (typeof quality !== 'number' || quality < 0 || quality > 5) {
    return res.status(400).json({ error: 'quality must be a number between 0 and 5' });
  }

  const { rows: existingRows } = await pool.query(
    'SELECT * FROM flashcards WHERE id = $1 AND user_id = $2',
    [id, req.user.id],
  );
  const flashcard = existingRows[0];

  if (!flashcard) {
    return res.status(404).json({ error: 'flashcard not found' });
  }

  const { easeFactor, intervalDays, reviewCount, learningStatus } = applySm2({
    quality,
    easeFactor: Number(flashcard.ease_factor),
    intervalDays: flashcard.interval_days,
    reviewCount: flashcard.review_count,
  });

  const { rows } = await pool.query(
    `UPDATE flashcards SET
       ease_factor = $1,
       interval_days = $2,
       review_count = $3,
       learning_status = $4,
       last_reviewed = now(),
       next_review = now() + make_interval(days => $2::int)
     WHERE id = $5
     RETURNING *`,
    [easeFactor, intervalDays, reviewCount, learningStatus, id],
  );

  res.json(rows[0]);
}

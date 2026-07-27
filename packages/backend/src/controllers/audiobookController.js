import { pool } from '../config/database.js';
import { getUserPlan, isPaidPlan } from '../services/planService.js';

export const PAYWALL_MESSAGE =
  'Este audiobook faz parte do TechSpeak Vitalicio. Faca login e adquira o acesso para continuar.';

// Dia 51-52: a draft (published_at IS NULL) or scheduled-for-the-future
// audiobook doesn't exist yet from the public catalog's point of view - the
// CMS's admin-only endpoints (adminAudiobookController.js) are the only way
// to see/preview those.
const PUBLISHED_FILTER = 'published_at IS NOT NULL AND published_at <= now()';

export async function listAudiobooks(req, res) {
  const { rows } = await pool.query(
    `SELECT id, title, description, category, duration_minutes, level, is_free, created_at
     FROM audiobooks
     WHERE ${PUBLISHED_FILTER}
     ORDER BY created_at DESC`,
  );
  res.json(rows);
}

export async function getAudiobook(req, res) {
  const { rows } = await pool.query(
    `SELECT * FROM audiobooks WHERE id = $1 AND ${PUBLISHED_FILTER}`,
    [req.params.id],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'audiobook not found' });
  }

  res.json(rows[0]);
}

export async function getAudiobookChapters(req, res) {
  const { rows: audiobookRows } = await pool.query(
    `SELECT is_free FROM audiobooks WHERE id = $1 AND ${PUBLISHED_FILTER}`,
    [req.params.id],
  );

  if (audiobookRows.length === 0) {
    return res.status(404).json({ error: 'audiobook not found' });
  }

  if (!audiobookRows[0].is_free) {
    const plan = req.user ? await getUserPlan(req.user.id) : 'free';
    if (!isPaidPlan(plan)) {
      return res.status(403).json({ error: PAYWALL_MESSAGE });
    }
  }

  const { rows } = await pool.query(
    `SELECT id, audiobook_id, title, order_index, audio_url, duration_seconds, transcript, created_at
     FROM chapters
     WHERE audiobook_id = $1
     ORDER BY order_index ASC`,
    [req.params.id],
  );
  res.json(rows);
}

export async function getChapterWords(req, res) {
  const { rows } = await pool.query(
    `SELECT w.id, w.word, w.pronunciation,
            COALESCE(w.portuguese_translation, d.portuguese_translation) AS portuguese_translation,
            COALESCE(w.technical_explanation, d.technical_explanation) AS technical_explanation,
            COALESCE(w.example_sentence, d.example_sentence) AS example_sentence,
            d.part_of_speech, d.contexts,
            w.chapter_id, w.start_seconds, w.end_seconds
     FROM words w
     LEFT JOIN technical_dictionary d ON lower(d.word) = lower(w.word)
     WHERE w.chapter_id = $1
     ORDER BY w.start_seconds ASC NULLS LAST`,
    [req.params.chapterId],
  );
  res.json(rows);
}

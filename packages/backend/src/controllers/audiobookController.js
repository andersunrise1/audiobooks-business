import { pool } from '../config/database.js';

export async function listAudiobooks(req, res) {
  const { rows } = await pool.query(
    'SELECT id, title, description, category, duration_minutes, level, created_at FROM audiobooks ORDER BY created_at DESC',
  );
  res.json(rows);
}

export async function getAudiobook(req, res) {
  const { rows } = await pool.query('SELECT * FROM audiobooks WHERE id = $1', [req.params.id]);

  if (rows.length === 0) {
    return res.status(404).json({ error: 'audiobook not found' });
  }

  res.json(rows[0]);
}

export async function getAudiobookChapters(req, res) {
  const { rows } = await pool.query(
    `SELECT id, audiobook_id, title, order_index, audio_url, duration_seconds, created_at
     FROM chapters
     WHERE audiobook_id = $1
     ORDER BY order_index ASC`,
    [req.params.id],
  );
  res.json(rows);
}

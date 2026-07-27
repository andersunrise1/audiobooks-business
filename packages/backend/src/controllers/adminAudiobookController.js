import { pool } from '../config/database.js';
import {
  isS3Configured,
  isAcceptedAudioType,
  uploadAudioFile,
} from '../services/audioStorageService.js';

export const AUDIO_STORAGE_NOT_CONFIGURED_ERROR =
  'Audio storage is not configured (missing AWS S3 credentials)';

function parseWordsMetadata(raw) {
  if (!raw) return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return Array.isArray(parsed) ? parsed : null;
}

// Returns { valid: true, value } | { valid: false }. An empty/missing input
// means "no publish date" (draft), which callers treat as null, not an error.
function parsePublishedAt(raw) {
  if (!raw) return { valid: true, value: null };

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { valid: false, value: null };

  return { valid: true, value: parsed.toISOString() };
}

export async function createAudiobookWithChapter(req, res) {
  const { title, description, category, level, chapterTitle, transcript } = req.body;

  if (!title || !transcript) {
    return res.status(400).json({ error: 'title and transcript are required' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'audio_file is required' });
  }

  if (!isAcceptedAudioType(req.file.mimetype)) {
    return res.status(400).json({ error: `unsupported audio format: ${req.file.mimetype}` });
  }

  const words = parseWordsMetadata(req.body.words_metadata);
  if (words === null) {
    return res.status(400).json({ error: 'words_metadata must be a JSON array' });
  }

  // Defaults to a draft (published_at = null) rather than going live
  // immediately - a deliberate CMS behavior change from the Dia 43 version of
  // this endpoint, so a partially-prepared upload can be reviewed/previewed
  // before anyone else can see it. Pass publishedAt to schedule or publish
  // immediately at upload time instead.
  const publishedAt = parsePublishedAt(req.body.publishedAt);
  if (!publishedAt.valid) {
    return res.status(400).json({ error: 'publishedAt must be a valid date' });
  }

  if (!isS3Configured()) {
    return res.status(503).json({ error: AUDIO_STORAGE_NOT_CONFIGURED_ERROR });
  }

  const audioUrl = await uploadAudioFile(req.file.buffer, req.file.mimetype);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: bookRows } = await client.query(
      `INSERT INTO audiobooks (title, description, category, level, published_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [title, description || null, category || null, level || null, publishedAt.value],
    );
    const audiobookId = bookRows[0].id;

    const { rows: chapterRows } = await client.query(
      `INSERT INTO chapters (audiobook_id, title, order_index, audio_url, transcript)
       VALUES ($1, $2, 1, $3, $4)
       RETURNING id`,
      [audiobookId, chapterTitle || 'Chapter 1', audioUrl, transcript],
    );
    const chapterId = chapterRows[0].id;

    for (const word of words) {
      if (!word?.word) continue;
      await client.query(
        `INSERT INTO words (word, chapter_id, start_seconds, end_seconds)
         VALUES ($1, $2, $3, $4)`,
        [word.word, chapterId, word.start_seconds ?? null, word.end_seconds ?? null],
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ audiobookId, chapterId, audioUrl, publishedAt: publishedAt.value });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listAllAudiobooks(req, res) {
  const { rows } = await pool.query(
    `SELECT id, title, description, category, level, is_free, published_at, created_at
     FROM audiobooks
     ORDER BY created_at DESC`,
  );
  res.json(rows);
}

export async function getAudiobookPreview(req, res) {
  const { rows: bookRows } = await pool.query('SELECT * FROM audiobooks WHERE id = $1', [
    req.params.id,
  ]);

  if (bookRows.length === 0) {
    return res.status(404).json({ error: 'audiobook not found' });
  }

  const { rows: chapterRows } = await pool.query(
    `SELECT id, title, order_index, audio_url, duration_seconds, transcript
     FROM chapters
     WHERE audiobook_id = $1
     ORDER BY order_index ASC`,
    [req.params.id],
  );

  res.json({ ...bookRows[0], chapters: chapterRows });
}

export async function publishAudiobook(req, res) {
  const publishedAt = parsePublishedAt(req.body?.publishedAt ?? new Date().toISOString());
  if (!publishedAt.valid) {
    return res.status(400).json({ error: 'publishedAt must be a valid date' });
  }

  const { rows } = await pool.query(
    `UPDATE audiobooks SET published_at = $1 WHERE id = $2 RETURNING id, title, published_at`,
    [publishedAt.value, req.params.id],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'audiobook not found' });
  }

  res.json(rows[0]);
}

export async function unpublishAudiobook(req, res) {
  const { rows } = await pool.query(
    `UPDATE audiobooks SET published_at = NULL WHERE id = $1 RETURNING id, title, published_at`,
    [req.params.id],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'audiobook not found' });
  }

  res.json(rows[0]);
}

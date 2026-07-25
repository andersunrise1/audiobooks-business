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

  if (!isS3Configured()) {
    return res.status(503).json({ error: AUDIO_STORAGE_NOT_CONFIGURED_ERROR });
  }

  const audioUrl = await uploadAudioFile(req.file.buffer, req.file.mimetype);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: bookRows } = await client.query(
      `INSERT INTO audiobooks (title, description, category, level)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [title, description || null, category || null, level || null],
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
    res.status(201).json({ audiobookId, chapterId, audioUrl });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

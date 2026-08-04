import { pool } from '../config/database.js';
import { getUserPlan, isPaidPlan } from '../services/planService.js';

export const PAYWALL_MESSAGE =
  'Este audiobook faz parte do TECHSPEAKING Vitalicio. Faca login e adquira o acesso para continuar.';

// Dia 51-52: a draft (published_at IS NULL) or scheduled-for-the-future
// audiobook doesn't exist yet from the public catalog's point of view - the
// CMS's admin-only endpoints (adminAudiobookController.js) are the only way
// to see/preview those.
const PUBLISHED_FILTER = 'published_at IS NOT NULL AND published_at <= now()';

// Locally-generated media (narration audio from scripts/generateNarration.js,
// cover illustrations from scripts/generateCovers.js) is stored with
// whatever BACKEND_PUBLIC_URL was at generation time (e.g.
// http://localhost:3000) baked into the URL - that host is only reachable
// from the machine that generated it. Rewriting the origin to match how
// this particular request actually reached the server (its own Host
// header) lets the same data serve a phone/LAN client, a tunnel, or a real
// deployed domain without a DB migration. Only this app's own local static
// routes (/audio/*, /covers/*) are rewritten - a future S3/CDN-hosted URL
// wouldn't match either prefix and passes through untouched.
const LOCAL_MEDIA_PREFIXES = ['/audio/', '/covers/'];

function resolveLocalMediaUrl(url, req) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!LOCAL_MEDIA_PREFIXES.some((prefix) => parsed.pathname.startsWith(prefix))) return url;
    return `${req.protocol}://${req.get('host')}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

export async function listAudiobooks(req, res) {
  const { rows } = await pool.query(
    `SELECT id, title, description, category, duration_minutes, level, is_free, cover_image_url, created_at
     FROM audiobooks
     WHERE ${PUBLISHED_FILTER}
     ORDER BY created_at DESC`,
  );

  const audiobooks = rows.map((audiobook) => ({
    ...audiobook,
    cover_image_url: resolveLocalMediaUrl(audiobook.cover_image_url, req),
  }));

  res.json(audiobooks);
}

export async function getAudiobook(req, res) {
  const { rows } = await pool.query(
    `SELECT * FROM audiobooks WHERE id = $1 AND ${PUBLISHED_FILTER}`,
    [req.params.id],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'audiobook not found' });
  }

  res.json({ ...rows[0], cover_image_url: resolveLocalMediaUrl(rows[0].cover_image_url, req) });
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
    `SELECT id, audiobook_id, title, order_index, audio_url, audio_url_female, audio_url_male,
            duration_seconds, transcript, created_at
     FROM chapters
     WHERE audiobook_id = $1
     ORDER BY order_index ASC`,
    [req.params.id],
  );

  const chapters = rows.map((chapter) => ({
    ...chapter,
    audio_url: resolveLocalMediaUrl(chapter.audio_url, req),
    audio_url_female: resolveLocalMediaUrl(chapter.audio_url_female, req),
    audio_url_male: resolveLocalMediaUrl(chapter.audio_url_male, req),
  }));

  res.json(chapters);
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

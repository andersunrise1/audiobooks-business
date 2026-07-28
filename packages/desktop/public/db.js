const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

let db = null;

function init(userDataPath) {
  fs.mkdirSync(userDataPath, { recursive: true });
  db = new DatabaseSync(path.join(userDataPath, 'techspeak-cache.sqlite'));

  db.exec(`
    CREATE TABLE IF NOT EXISTS progress_cache (
      chapter_id TEXT PRIMARY KEY,
      words_learned INTEGER DEFAULT 0,
      listening_count INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      last_accessed TEXT
    );

    CREATE TABLE IF NOT EXISTS flashcards_cache (
      id TEXT PRIMARY KEY,
      word TEXT,
      portuguese_translation TEXT,
      technical_explanation TEXT,
      example_sentence TEXT,
      learning_status TEXT,
      review_count INTEGER DEFAULT 0,
      next_review TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS review_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flashcard_id TEXT NOT NULL,
      quality INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audio_cache (
      chapter_id TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0
    );

    -- Small generic key/value store for notification dedup state (which
    -- audiobook ids we've already notified about, the last-seen streak, when
    -- we last nudged about due flashcards) - not worth a dedicated table per
    -- key, and this state is inherently local-only (never synced to the
    -- backend).
    CREATE TABLE IF NOT EXISTS kv_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  return db;
}

function getCachedProgress() {
  return db.prepare('SELECT * FROM progress_cache').all();
}

// Dia 78-79: DELETE-then-reinsert with no transaction meant a failure partway
// through the insert loop (or the process being killed mid-loop) left the
// local cache empty instead of either the old or the new data - the exact
// case this cache exists to survive (an offline user reopening the app).
// Wrapped in BEGIN/COMMIT/ROLLBACK so a failure restores the prior rows
// instead of losing them.
function replaceCachedProgress(rows) {
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM progress_cache');
    const insert = db.prepare(`
      INSERT INTO progress_cache (chapter_id, words_learned, listening_count, completed, last_accessed)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const row of rows) {
      insert.run(
        row.chapter_id,
        row.words_learned ?? 0,
        row.listening_count ?? 0,
        row.completed ? 1 : 0,
        row.last_accessed ?? null,
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function getCachedFlashcards() {
  return db.prepare('SELECT * FROM flashcards_cache ORDER BY next_review ASC').all();
}

function replaceCachedFlashcards(rows) {
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM flashcards_cache');
    const insert = db.prepare(`
      INSERT INTO flashcards_cache (id, word, portuguese_translation, technical_explanation, example_sentence, learning_status, review_count, next_review)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const row of rows) {
      insert.run(
        row.id,
        row.word ?? null,
        row.portuguese_translation ?? null,
        row.technical_explanation ?? null,
        row.example_sentence ?? null,
        row.learning_status ?? 'new',
        row.review_count ?? 0,
        row.next_review ?? null,
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function queueProgressUpdate(chapterId, payload) {
  db.prepare('INSERT INTO sync_queue (chapter_id, payload, created_at) VALUES (?, ?, ?)').run(
    chapterId,
    JSON.stringify(payload),
    new Date().toISOString(),
  );

  db.prepare(
    `INSERT INTO progress_cache (chapter_id, words_learned, listening_count, completed, last_accessed)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(chapter_id) DO UPDATE SET
       words_learned = COALESCE(excluded.words_learned, progress_cache.words_learned),
       listening_count = COALESCE(excluded.listening_count, progress_cache.listening_count),
       completed = COALESCE(excluded.completed, progress_cache.completed),
       last_accessed = excluded.last_accessed`,
  ).run(
    chapterId,
    payload.wordsLearned ?? null,
    payload.listeningCount ?? null,
    payload.completed ? 1 : 0,
    new Date().toISOString(),
  );
}

function getQueuedUpdates() {
  return db.prepare('SELECT * FROM sync_queue ORDER BY id ASC').all();
}

function clearQueuedUpdate(id) {
  db.prepare('DELETE FROM sync_queue WHERE id = ?').run(id);
}

// Reviews are queued as the raw (flashcardId, quality) rating rather than a
// pre-computed SM-2 result: applySm2 needs the card's *current* server-side
// ease_factor/interval/review_count, which may have advanced since this
// device last synced - replaying the raw rating through the real review
// endpoint once back online lets the server (the single source of truth,
// same principle as Dia 61-62's progress conflict-resolution fix) compute
// the correct next state instead of the queued write clobbering it.
function queueReview(flashcardId, quality) {
  db.prepare('INSERT INTO review_queue (flashcard_id, quality, created_at) VALUES (?, ?, ?)').run(
    flashcardId,
    quality,
    new Date().toISOString(),
  );
}

function getQueuedReviews() {
  return db.prepare('SELECT * FROM review_queue ORDER BY id ASC').all();
}

function clearQueuedReview(id) {
  db.prepare('DELETE FROM review_queue WHERE id = ?').run(id);
}

function getCachedAudioPath(chapterId) {
  const row = db.prepare('SELECT file_path FROM audio_cache WHERE chapter_id = ?').get(chapterId);
  return row?.file_path ?? null;
}

function recordCachedAudio(chapterId, filePath) {
  db.prepare(
    `INSERT INTO audio_cache (chapter_id, file_path, cached_at)
     VALUES (?, ?, ?)
     ON CONFLICT(chapter_id) DO UPDATE SET file_path = excluded.file_path, cached_at = excluded.cached_at`,
  ).run(chapterId, filePath, new Date().toISOString());
}

function recordNotification(type, title, body) {
  db.prepare('INSERT INTO notifications (type, title, body, created_at) VALUES (?, ?, ?, ?)').run(
    type,
    title,
    body,
    new Date().toISOString(),
  );
}

function getNotifications() {
  return db.prepare('SELECT * FROM notifications ORDER BY created_at DESC').all();
}

function markNotificationRead(id) {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
}

function getState(key) {
  const row = db.prepare('SELECT value FROM kv_state WHERE key = ?').get(key);
  return row?.value ?? null;
}

function setState(key, value) {
  db.prepare(
    'INSERT INTO kv_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, value);
}

function close() {
  db?.close();
}

module.exports = {
  init,
  getCachedProgress,
  replaceCachedProgress,
  getCachedFlashcards,
  replaceCachedFlashcards,
  queueProgressUpdate,
  getQueuedUpdates,
  clearQueuedUpdate,
  queueReview,
  getQueuedReviews,
  clearQueuedReview,
  getCachedAudioPath,
  recordCachedAudio,
  recordNotification,
  getNotifications,
  markNotificationRead,
  getState,
  setState,
  close,
};

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
  `);

  return db;
}

function getCachedProgress() {
  return db.prepare('SELECT * FROM progress_cache').all();
}

function replaceCachedProgress(rows) {
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
}

function getCachedFlashcards() {
  return db.prepare('SELECT * FROM flashcards_cache ORDER BY next_review ASC').all();
}

function replaceCachedFlashcards(rows) {
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
  close,
};

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/config/database.js';
import { getStudyPriority } from '../../src/services/schedulingService.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('schedulingService.getStudyPriority', () => {
  let audiobookId;
  let chapterId;
  let wordStruggledId;
  let wordDueId;
  let wordMasteredId;
  let userId;

  before(async () => {
    audiobookId = randomUUID();
    chapterId = randomUUID();
    wordStruggledId = randomUUID();
    wordDueId = randomUUID();
    wordMasteredId = randomUUID();
    userId = randomUUID();

    await pool.query(`INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'unused')`, [
      userId,
      `scheduling-${userId}@techspeak.test`,
    ]);
    await pool.query(`INSERT INTO audiobooks (id, title) VALUES ($1, 'Scheduling Test Book')`, [
      audiobookId,
    ]);
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index) VALUES ($1, $2, 'Chapter', 1)`,
      [chapterId, audiobookId],
    );
    await pool.query(
      `INSERT INTO words (id, word, chapter_id) VALUES
       ($1, 'rollback', $4), ($2, 'commit', $4), ($3, 'merge', $4)`,
      [wordStruggledId, wordDueId, wordMasteredId, chapterId],
    );

    // "rollback" clicked 4 times (struggled), "commit" clicked once, "merge" never clicked.
    await pool.query(
      `INSERT INTO word_clicks (user_id, word_id, chapter_id) VALUES
       ($1, $2, $4), ($1, $2, $4), ($1, $2, $4), ($1, $2, $4), ($1, $3, $4)`,
      [userId, wordStruggledId, wordDueId, chapterId],
    );

    // Flashcards: struggled word due far in the future, "commit" due now,
    // "merge" already mastered (should be excluded entirely).
    await pool.query(
      `INSERT INTO flashcards (user_id, word_id, learning_status, next_review) VALUES
       ($1, $2, 'learning', now() + interval '10 days'),
       ($1, $3, 'learning', now() - interval '1 day'),
       ($1, $4, 'mastered', now() - interval '1 day')`,
      [userId, wordStruggledId, wordDueId, wordMasteredId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM audiobooks WHERE id = $1', [audiobookId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  });

  test('ranks the most-clicked word first even though it is not due yet', async () => {
    const result = await getStudyPriority(userId);
    assert.equal(result[0].wordId, wordStruggledId);
    assert.equal(result[0].clickCount, 4);
  });

  test('excludes mastered flashcards', async () => {
    const result = await getStudyPriority(userId);
    assert.ok(!result.some((item) => item.wordId === wordMasteredId));
  });

  test('includes the less-clicked but due word after the struggled one', async () => {
    const result = await getStudyPriority(userId);
    assert.deepEqual(
      result.map((item) => item.wordId),
      [wordStruggledId, wordDueId],
    );
  });
});

describe('GET /api/user/study-priority', () => {
  let server;
  let baseUrl;
  let accessToken;
  let userId;
  let audiobookId;
  let chapterId;
  let wordId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
    const registered = await registerTestUser(baseUrl);
    accessToken = registered.accessToken;
    userId = registered.user.id;

    audiobookId = randomUUID();
    chapterId = randomUUID();
    wordId = randomUUID();

    await pool.query(`INSERT INTO audiobooks (id, title) VALUES ($1, 'Endpoint Test Book')`, [
      audiobookId,
    ]);
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index) VALUES ($1, $2, 'Chapter', 1)`,
      [chapterId, audiobookId],
    );
    await pool.query(`INSERT INTO words (id, word, chapter_id) VALUES ($1, 'deploy', $2)`, [
      wordId,
      chapterId,
    ]);
    await pool.query(
      `INSERT INTO flashcards (user_id, word_id, learning_status) VALUES ($1, $2, 'new')`,
      [userId, wordId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM audiobooks WHERE id = $1', [audiobookId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await stopTestServer(server);
  });

  test('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/user/study-priority`);
    assert.equal(res.status, 401);
  });

  test('returns the ranked flashcard queue', async () => {
    const res = await fetch(`${baseUrl}/api/user/study-priority`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.length, 1);
    assert.equal(data[0].word, 'deploy');
    assert.equal(data[0].clickCount, 0);
  });
});

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/config/database.js';
import { findRepeatedDifficultWords } from '../../src/services/wordRepetitionService.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('wordRepetitionService.findRepeatedDifficultWords', () => {
  let audiobookId;
  let chapterPastId;
  let chapterFutureId;
  let wordDeployedPastId;
  let wordDeployedFutureId;
  let wordCommitId;
  let userAId;
  let userBId;

  before(async () => {
    audiobookId = randomUUID();
    chapterPastId = randomUUID();
    chapterFutureId = randomUUID();
    wordDeployedPastId = randomUUID();
    wordDeployedFutureId = randomUUID();
    wordCommitId = randomUUID();
    userAId = randomUUID();
    userBId = randomUUID();

    await pool.query(
      `INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'unused'), ($3, $4, 'unused')`,
      [
        userAId,
        `repetition-a-${userAId}@techspeak.test`,
        userBId,
        `repetition-b-${userBId}@techspeak.test`,
      ],
    );
    await pool.query(`INSERT INTO audiobooks (id, title) VALUES ($1, 'Repetition Test Book')`, [
      audiobookId,
    ]);
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index) VALUES
       ($1, $3, 'Past Chapter', 1), ($2, $3, 'Future Chapter', 2)`,
      [chapterPastId, chapterFutureId, audiobookId],
    );
    await pool.query(
      `INSERT INTO words (id, word, chapter_id) VALUES
       ($1, 'Deployed', $4), ($2, 'deployed', $5), ($3, 'commit', $4)`,
      [wordDeployedPastId, wordDeployedFutureId, wordCommitId, chapterPastId, chapterFutureId],
    );

    // userA struggles with "deployed" (clicked twice in the past chapter)
    // but only clicks "commit" once (not a struggle).
    await pool.query(
      `INSERT INTO word_clicks (user_id, word_id, chapter_id) VALUES
       ($1, $2, $4), ($1, $2, $4), ($1, $3, $4)`,
      [userAId, wordDeployedPastId, wordCommitId, chapterPastId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM audiobooks WHERE id = $1', [audiobookId]);
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [[userAId, userBId]]);
  });

  test('flags a word in a future chapter that matches a previously struggled word (case-insensitive)', async () => {
    const result = await findRepeatedDifficultWords(userAId, chapterFutureId);
    assert.deepEqual(result, [
      { wordId: wordDeployedFutureId, word: 'deployed', previousClickCount: 2 },
    ]);
  });

  test('also flags the word in the chapter where the struggle originally happened', async () => {
    const result = await findRepeatedDifficultWords(userAId, chapterPastId);
    assert.deepEqual(result, [
      { wordId: wordDeployedPastId, word: 'Deployed', previousClickCount: 2 },
    ]);
  });

  test('does not flag a word clicked only once', async () => {
    const result = await findRepeatedDifficultWords(userAId, chapterFutureId);
    assert.ok(!result.some((w) => w.word === 'commit'));
  });

  test('returns nothing for a user with no click history', async () => {
    const result = await findRepeatedDifficultWords(userBId, chapterFutureId);
    assert.deepEqual(result, []);
  });
});

describe('GET /api/user/chapters/:chapterId/repeated-words', () => {
  let server;
  let baseUrl;
  let accessToken;
  let userId;
  let audiobookId;
  let chapterPastId;
  let chapterFutureId;
  let wordFutureId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
    const registered = await registerTestUser(baseUrl);
    accessToken = registered.accessToken;
    userId = registered.user.id;

    audiobookId = randomUUID();
    chapterPastId = randomUUID();
    chapterFutureId = randomUUID();
    const wordPastId = randomUUID();
    wordFutureId = randomUUID();

    await pool.query(`INSERT INTO audiobooks (id, title) VALUES ($1, 'Endpoint Test Book')`, [
      audiobookId,
    ]);
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index) VALUES
       ($1, $3, 'Past', 1), ($2, $3, 'Future', 2)`,
      [chapterPastId, chapterFutureId, audiobookId],
    );
    await pool.query(
      `INSERT INTO words (id, word, chapter_id) VALUES ($1, 'rollback', $3), ($2, 'rollback', $4)`,
      [wordPastId, wordFutureId, chapterPastId, chapterFutureId],
    );
    await pool.query(
      `INSERT INTO word_clicks (user_id, word_id, chapter_id) VALUES ($1, $2, $3), ($1, $2, $3)`,
      [userId, wordPastId, chapterPastId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM audiobooks WHERE id = $1', [audiobookId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await stopTestServer(server);
  });

  test('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/user/chapters/${chapterFutureId}/repeated-words`);
    assert.equal(res.status, 401);
  });

  test('returns the repeated difficult words for the given chapter', async () => {
    const res = await fetch(`${baseUrl}/api/user/chapters/${chapterFutureId}/repeated-words`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.deepEqual(data, [{ wordId: wordFutureId, word: 'rollback', previousClickCount: 2 }]);
  });
});

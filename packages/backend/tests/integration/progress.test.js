import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/config/database.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('POST /api/user/progress/:chapterId (Dia 61-62 conflict resolution)', () => {
  let server;
  let baseUrl;
  let accessToken;
  let userId;
  let audiobookId;
  let chapterId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
    const registered = await registerTestUser(baseUrl);
    accessToken = registered.accessToken;
    userId = registered.user.id;

    audiobookId = randomUUID();
    chapterId = randomUUID();
    await pool.query(`INSERT INTO audiobooks (id, title) VALUES ($1, 'Sync Test Audiobook')`, [
      audiobookId,
    ]);
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index) VALUES ($1, $2, 'Chapter 1', 1)`,
      [chapterId, audiobookId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM audiobooks WHERE id = $1', [audiobookId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await stopTestServer(server);
  });

  function postProgress(body) {
    return fetch(`${baseUrl}/api/user/progress/${chapterId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    }).then((r) => r.json());
  }

  test('creates a new row on the first update', async () => {
    const data = await postProgress({ listeningCount: 1, wordsLearned: 2 });
    assert.equal(data.listening_count, 1);
    assert.equal(data.words_learned, 2);
    assert.equal(data.completed, false);
  });

  test('a genuinely higher value moves the counters forward', async () => {
    const data = await postProgress({ listeningCount: 3, wordsLearned: 5 });
    assert.equal(data.listening_count, 3);
    assert.equal(data.words_learned, 5);
  });

  test('a stale lower value (e.g. a queued offline update) does not regress the counters', async () => {
    // Simulates a desktop client that queued {listeningCount: 1} while
    // offline, computed before this same user reached 3 on another device -
    // pushing it late must not roll the count back down to 1.
    const data = await postProgress({ listeningCount: 1, wordsLearned: 2 });
    assert.equal(data.listening_count, 3);
    assert.equal(data.words_learned, 5);
  });

  test('omitted fields keep their existing value', async () => {
    const data = await postProgress({ completed: true });
    assert.equal(data.listening_count, 3);
    assert.equal(data.words_learned, 5);
    assert.equal(data.completed, true);
  });

  test('completed stays true even if a later update explicitly sends false', async () => {
    const data = await postProgress({ completed: false });
    assert.equal(data.completed, true);
  });
});

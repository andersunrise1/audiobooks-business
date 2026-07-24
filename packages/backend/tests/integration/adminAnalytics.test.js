import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/config/database.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('GET /api/admin/analytics', () => {
  let server;
  let baseUrl;
  let adminAccessToken;
  let adminUserId;
  let plainAccessToken;
  let plainUserId;
  let audiobookId;
  let chapterId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());

    const admin = await registerTestUser(baseUrl);
    adminAccessToken = admin.accessToken;
    adminUserId = admin.user.id;
    await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [adminUserId]);

    const plain = await registerTestUser(baseUrl);
    plainAccessToken = plain.accessToken;
    plainUserId = plain.user.id;

    audiobookId = randomUUID();
    chapterId = randomUUID();
    await pool.query(`INSERT INTO audiobooks (id, title) VALUES ($1, 'Test Audiobook')`, [
      audiobookId,
    ]);
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index) VALUES ($1, $2, 'Daily Standup', 1)`,
      [chapterId, audiobookId],
    );

    await pool.query(
      `INSERT INTO chat_messages (user_id, chapter_id, message, response, feedback) VALUES
       ($1, $2, 'oi', 'ola', 'helpful'),
       ($1, $2, 'e ai', 'tudo bem', 'not_helpful')`,
      [plainUserId, chapterId],
    );

    await pool.query(
      `INSERT INTO ai_usage_log (user_id, endpoint, model, input_tokens, output_tokens, estimated_cost_usd, response_time_ms)
       VALUES ($1, 'explain', 'claude-haiku-4-5', 100, 50, 0.001, 1200)`,
      [plainUserId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM audiobooks WHERE id = $1', [audiobookId]);
    await pool.query('DELETE FROM users WHERE id = $1', [adminUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [plainUserId]);
    await stopTestServer(server);
  });

  test('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/admin/analytics`);
    assert.equal(res.status, 401);
  });

  test('rejects a non-admin user', async () => {
    const res = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${plainAccessToken}` },
    });
    assert.equal(res.status, 403);
  });

  test('returns aggregated analytics for an admin', async () => {
    const res = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert.equal(res.status, 200);

    const data = await res.json();

    const chapterRow = data.questionsPerChapter.find((row) => row.chapterId === chapterId);
    assert.equal(chapterRow.questionCount, 2);

    assert.equal(data.satisfaction.helpfulCount, 1);
    assert.equal(data.satisfaction.notHelpfulCount, 1);
    assert.equal(data.satisfaction.satisfactionRate, 0.5);

    // avgResponseTime is a global aggregate across every "explain" call ever
    // logged in this DB, not just this test's row, so only assert shape -
    // an exact value would be brittle against other tests/manual runs that
    // also log real explain calls.
    const endpointRow = data.avgResponseTime.find((row) => row.endpoint === 'explain');
    assert.ok(endpointRow.callCount >= 1);
    assert.ok(endpointRow.avgResponseTimeMs > 0);

    const userRow = data.costPerUser.find((row) => row.userId === plainUserId);
    assert.equal(userRow.requestCount, 1);
    assert.ok(userRow.totalCostUsd > 0);
  });
});

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
    // satisfaction and avgResponseTime are global aggregates across every
    // chat_messages/ai_usage_log row ever created in this DB, not just this
    // test's fixtures - a shared dev DB can carry real rows from manual
    // verification sessions. Comparing before/after deltas (rather than
    // exact absolute counts) keeps the assertions correct regardless.
    const before = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    }).then((r) => r.json());

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

    const res = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert.equal(res.status, 200);

    const data = await res.json();

    const chapterRow = data.questionsPerChapter.find((row) => row.chapterId === chapterId);
    assert.equal(chapterRow.questionCount, 2);

    assert.equal(data.satisfaction.helpfulCount, before.satisfaction.helpfulCount + 1);
    assert.equal(data.satisfaction.notHelpfulCount, before.satisfaction.notHelpfulCount + 1);

    const endpointRow = data.avgResponseTime.find((row) => row.endpoint === 'explain');
    const beforeEndpointRow = before.avgResponseTime.find((row) => row.endpoint === 'explain');
    assert.equal(endpointRow.callCount, (beforeEndpointRow?.callCount ?? 0) + 1);

    const userRow = data.costPerUser.find((row) => row.userId === plainUserId);
    assert.equal(userRow.requestCount, 1);
    assert.ok(userRow.totalCostUsd > 0);
  });
});

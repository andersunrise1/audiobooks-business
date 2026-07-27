import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/config/database.js';
import { LIFETIME_PRICE_BRL_CENTS } from '../../src/services/paymentService.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('GET /api/admin/content-analytics (Dia 53-54)', () => {
  let server;
  let baseUrl;
  let adminAccessToken;
  let adminUserId;
  let plainAccessToken;
  let plainUserId;
  let audiobookId;
  let chapterOneId;
  let chapterTwoId;
  const createdUserIds = [];

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
    chapterOneId = randomUUID();
    chapterTwoId = randomUUID();
    await pool.query(`INSERT INTO audiobooks (id, title) VALUES ($1, 'Completion Test Book')`, [
      audiobookId,
    ]);
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index) VALUES
       ($1, $3, 'Chapter 1', 1), ($2, $3, 'Chapter 2', 2)`,
      [chapterOneId, chapterTwoId, audiobookId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM audiobooks WHERE id = $1', [audiobookId]);
    await pool.query('DELETE FROM users WHERE id = $1', [adminUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [plainUserId]);
    if (createdUserIds.length > 0) {
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [createdUserIds]);
    }
    await stopTestServer(server);
  });

  test('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/admin/content-analytics`);
    assert.equal(res.status, 401);
  });

  test('rejects a non-admin user', async () => {
    const res = await fetch(`${baseUrl}/api/admin/content-analytics`, {
      headers: { Authorization: `Bearer ${plainAccessToken}` },
    });
    assert.equal(res.status, 403);
  });

  test('computes audiobook completion rates from user_progress', async () => {
    const finisher = await registerTestUser(baseUrl);
    const partial = await registerTestUser(baseUrl);
    createdUserIds.push(finisher.user.id, partial.user.id);

    await pool.query(
      `INSERT INTO user_progress (user_id, chapter_id, completed) VALUES
       ($1, $3, true), ($1, $4, true),
       ($2, $3, true)`,
      [finisher.user.id, partial.user.id, chapterOneId, chapterTwoId],
    );

    const res = await fetch(`${baseUrl}/api/admin/content-analytics`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();

    const row = data.completionRates.find((r) => r.audiobookId === audiobookId);
    assert.equal(row.usersStarted, 2);
    assert.equal(row.usersCompleted, 1);
    assert.equal(row.completionRate, 0.5);
  });

  // Unlike the completion-rate test above (scoped to one audiobookId that
  // only this file touches), retention/LTV are deliberately global
  // aggregates - `users`/`word_clicks` are created AND deleted by nearly
  // every other integration test file running concurrently against the same
  // real Postgres (node:test runs files in parallel), so neither an exact
  // delta nor a ">= before + N" comparison is safe here: a concurrent file's
  // own cleanup can remove more rows than this test adds in the same window.
  // The exact arithmetic (rates, rounding, null-handling) is already covered
  // precisely with mocked data in contentAnalyticsService.test.js; what's
  // worth proving against a real DB here is that the raw SQL runs and picks
  // up freshly-inserted rows in the right shape - checked via invariants that
  // hold no matter what else is happening concurrently.
  test('reflects real word_clicks activity through the retention endpoint', async () => {
    const churned = await registerTestUser(baseUrl);
    const retained = await registerTestUser(baseUrl);
    const fresh = await registerTestUser(baseUrl);
    createdUserIds.push(churned.user.id, retained.user.id, fresh.user.id);

    const { rows: wordRows } = await pool.query(
      `SELECT id FROM words WHERE chapter_id = $1 LIMIT 1`,
      [chapterOneId],
    );
    let wordId = wordRows[0]?.id;
    if (!wordId) {
      const inserted = await pool.query(
        `INSERT INTO words (word, chapter_id) VALUES ('deployed', $1) RETURNING id`,
        [chapterOneId],
      );
      wordId = inserted.rows[0].id;
    }

    await pool.query(
      `INSERT INTO word_clicks (user_id, word_id, chapter_id, created_at) VALUES
       ($1, $4, $5, now() - interval '45 days'),
       ($2, $4, $5, now() - interval '45 days'),
       ($2, $4, $5, now() - interval '5 days'),
       ($3, $4, $5, now() - interval '5 days')`,
      [churned.user.id, retained.user.id, fresh.user.id, wordId, chapterOneId],
    );

    const res = await fetch(`${baseUrl}/api/admin/content-analytics`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert.equal(res.status, 200);
    const { retention } = await res.json();

    // Invariants that must hold no matter what else the suite is doing
    // concurrently: we just inserted at least 2 previous-window and 2
    // recent-window active users (and 1 who is active in both), so these
    // floors can never be violated by other files' unrelated deletions.
    assert.ok(retention.previousPeriodActiveUsers >= 2);
    assert.ok(retention.recentPeriodActiveUsers >= 2);
    assert.ok(retention.retainedUsers >= 1);
    assert.ok(retention.retainedUsers <= retention.previousPeriodActiveUsers);
    assert.ok(retention.retainedUsers <= retention.recentPeriodActiveUsers);
  });

  test('reflects real paying users through the LTV endpoint', async () => {
    const payingUser = await registerTestUser(baseUrl);
    const freeUser = await registerTestUser(baseUrl);
    createdUserIds.push(payingUser.user.id, freeUser.user.id);
    await pool.query(`UPDATE users SET plan = 'pro' WHERE id = $1`, [payingUser.user.id]);

    const res = await fetch(`${baseUrl}/api/admin/content-analytics`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert.equal(res.status, 200);
    const { lifetimeValue } = await res.json();

    assert.ok(lifetimeValue.payingUsers >= 1);
    assert.ok(lifetimeValue.totalUsers >= lifetimeValue.payingUsers);
    // Internal consistency, true regardless of concurrent state: revenue is
    // always exactly payingUsers x the one-time price, since that's the
    // entire formula (no subscriptions/renewals to model).
    assert.equal(
      lifetimeValue.totalRevenueBrlCents,
      lifetimeValue.payingUsers * LIFETIME_PRICE_BRL_CENTS,
    );
  });
});

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/config/database.js';
import { closeRedis } from '../../src/config/redis.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

// This exercises the real Redis-backed rate limiter (aiRateLimit reads
// AI_DAILY_RATE_LIMIT_FREE/AI_DAILY_RATE_LIMIT_PRO fresh on every request,
// not once at module load, so it can be lowered per-test). Held-open Redis
// connection - close it after.
after(async () => {
  await closeRedis();
});

describe('AI rate limiting', () => {
  let server;
  let baseUrl;
  let accessToken;
  let userId;
  let originalFreeLimit;

  before(async () => {
    originalFreeLimit = process.env.AI_DAILY_RATE_LIMIT_FREE;
    process.env.AI_DAILY_RATE_LIMIT_FREE = '2';

    ({ server, baseUrl } = await startTestServer());
    const registered = await registerTestUser(baseUrl);
    accessToken = registered.accessToken;
    userId = registered.user.id;
  });

  after(async () => {
    process.env.AI_DAILY_RATE_LIMIT_FREE = originalFreeLimit;
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await stopTestServer(server);
  });

  function requestExplain(token) {
    return fetch(`${baseUrl}/api/ai/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ word: 'deployed', context: 'a CI/CD pipeline' }),
    });
  }

  test('blocks requests once a free-plan caller exceeds the configured daily limit', async () => {
    const first = await requestExplain(accessToken);
    const second = await requestExplain(accessToken);
    const third = await requestExplain(accessToken);

    assert.notEqual(first.status, 429);
    assert.notEqual(second.status, 429);
    assert.equal(third.status, 429);

    const data = await third.json();
    assert.match(data.error, /limite di.rio/i);
  });

  test('sets X-RateLimit-Remaining on an allowed request', async () => {
    process.env.AI_DAILY_RATE_LIMIT_FREE = '50';
    const registered = await registerTestUser(baseUrl);

    const res = await requestExplain(registered.accessToken);

    assert.equal(res.headers.get('x-ratelimit-limit'), '50');
    assert.equal(res.headers.get('x-ratelimit-remaining'), '49');

    await pool.query('DELETE FROM users WHERE id = $1', [registered.user.id]);
  });

  test('applies the higher paid-plan limit instead of the free-plan limit', async () => {
    process.env.AI_DAILY_RATE_LIMIT_FREE = '1';
    const originalProLimit = process.env.AI_DAILY_RATE_LIMIT_PRO;
    process.env.AI_DAILY_RATE_LIMIT_PRO = '3';

    const registered = await registerTestUser(baseUrl);
    await pool.query(`UPDATE users SET plan = 'pro' WHERE id = $1`, [registered.user.id]);

    try {
      const first = await requestExplain(registered.accessToken);
      const second = await requestExplain(registered.accessToken);

      assert.notEqual(first.status, 429);
      assert.notEqual(second.status, 429);
      assert.equal(first.headers.get('x-ratelimit-limit'), '3');
    } finally {
      process.env.AI_DAILY_RATE_LIMIT_PRO = originalProLimit;
      await pool.query('DELETE FROM users WHERE id = $1', [registered.user.id]);
    }
  });
});

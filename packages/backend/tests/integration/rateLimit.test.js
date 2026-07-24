import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/config/database.js';
import { closeRedis } from '../../src/config/redis.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

// This exercises the real Redis-backed rate limiter (aiRateLimit reads
// AI_DAILY_RATE_LIMIT fresh on every request, not once at module load, so
// it can be lowered per-test). Held-open Redis connection - close it after.
after(async () => {
  await closeRedis();
});

describe('AI rate limiting', () => {
  let server;
  let baseUrl;
  let accessToken;
  let userId;
  let originalLimit;

  before(async () => {
    originalLimit = process.env.AI_DAILY_RATE_LIMIT;
    process.env.AI_DAILY_RATE_LIMIT = '2';

    ({ server, baseUrl } = await startTestServer());
    const registered = await registerTestUser(baseUrl);
    accessToken = registered.accessToken;
    userId = registered.user.id;
  });

  after(async () => {
    process.env.AI_DAILY_RATE_LIMIT = originalLimit;
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await stopTestServer(server);
  });

  function requestExplain() {
    return fetch(`${baseUrl}/api/ai/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ word: 'deployed', context: 'a CI/CD pipeline' }),
    });
  }

  test('blocks requests once the caller exceeds the configured daily limit', async () => {
    const first = await requestExplain();
    const second = await requestExplain();
    const third = await requestExplain();

    assert.notEqual(first.status, 429);
    assert.notEqual(second.status, 429);
    assert.equal(third.status, 429);

    const data = await third.json();
    assert.match(data.error, /limite di.rio/i);
  });

  test('sets X-RateLimit-Remaining on an allowed request', async () => {
    process.env.AI_DAILY_RATE_LIMIT = '50';
    const registered = await registerTestUser(baseUrl);

    const res = await fetch(`${baseUrl}/api/ai/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${registered.accessToken}`,
      },
      body: JSON.stringify({ word: 'deployed', context: 'a CI/CD pipeline' }),
    });

    assert.equal(res.headers.get('x-ratelimit-limit'), '50');
    assert.equal(res.headers.get('x-ratelimit-remaining'), '49');

    await pool.query('DELETE FROM users WHERE id = $1', [registered.user.id]);
  });
});

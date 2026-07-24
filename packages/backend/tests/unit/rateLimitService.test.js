import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit, rateLimitExceededMessage } from '../../src/services/rateLimitService.js';
import { redisClient } from '../../src/config/redis.js';

// This must run before any successful-connect test below: connectRedis()
// memoizes a resolved connection promise at module scope once it succeeds,
// so once that happens a later "unreachable" mock would never actually be
// hit (same ordering constraint as cacheService.test.js).
describe('rateLimitService.checkRateLimit when Redis is unreachable', () => {
  test('fails open (allows the request) instead of throwing', async () => {
    const connectMock = mock.method(redisClient, 'connect', async () => {
      throw new Error('ECONNREFUSED');
    });

    try {
      const result = await checkRateLimit('user-1', 50);
      assert.equal(result.allowed, true);
    } finally {
      connectMock.mock.restore();
    }
  });
});

describe('rateLimitService.checkRateLimit when Redis is reachable', () => {
  test('allows the request and returns the running count when under the limit', async () => {
    const connectMock = mock.method(redisClient, 'connect', async () => {});
    const incrMock = mock.method(redisClient, 'incr', async () => 3);
    const expireMock = mock.method(redisClient, 'expire', async () => 1);

    try {
      const result = await checkRateLimit('user-1', 50);
      assert.deepEqual(result, { allowed: true, count: 3, limit: 50 });
      assert.equal(expireMock.mock.calls.length, 0);
    } finally {
      connectMock.mock.restore();
      incrMock.mock.restore();
      expireMock.mock.restore();
    }
  });

  test('sets an expiry only on the first increment of a window', async () => {
    const connectMock = mock.method(redisClient, 'connect', async () => {});
    const incrMock = mock.method(redisClient, 'incr', async () => 1);
    const expireMock = mock.method(redisClient, 'expire', async () => 1);

    try {
      await checkRateLimit('user-1', 50);
      assert.equal(expireMock.mock.calls.length, 1);
    } finally {
      connectMock.mock.restore();
      incrMock.mock.restore();
      expireMock.mock.restore();
    }
  });

  test('blocks the request once the count exceeds the limit', async () => {
    const connectMock = mock.method(redisClient, 'connect', async () => {});
    const incrMock = mock.method(redisClient, 'incr', async () => 51);
    const expireMock = mock.method(redisClient, 'expire', async () => 1);

    try {
      const result = await checkRateLimit('user-1', 50);
      assert.equal(result.allowed, false);
    } finally {
      connectMock.mock.restore();
      incrMock.mock.restore();
      expireMock.mock.restore();
    }
  });
});

describe('rateLimitService.rateLimitExceededMessage', () => {
  test('includes the limit in the message', () => {
    assert.match(rateLimitExceededMessage(50), /50/);
  });
});

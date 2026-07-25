import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkRateLimit,
  rateLimitExceededMessage,
  getDailyAiLimit,
} from '../../src/services/rateLimitService.js';
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

describe('rateLimitService.getDailyAiLimit (Dia 40, plan-aware since Dia 49)', () => {
  function withEnv(vars, fn) {
    const originals = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
    Object.assign(process.env, vars);
    try {
      return fn();
    } finally {
      for (const [k, v] of Object.entries(originals)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  }

  test('defaults free plans to 1/day when AI_DAILY_RATE_LIMIT_FREE is unset', () => {
    withEnv({ AI_DAILY_RATE_LIMIT_FREE: undefined }, () => {
      delete process.env.AI_DAILY_RATE_LIMIT_FREE;
      assert.equal(getDailyAiLimit('free'), 1);
      assert.equal(getDailyAiLimit(undefined), 1);
    });
  });

  test('defaults paid plans to 10/day when AI_DAILY_RATE_LIMIT_PRO is unset', () => {
    withEnv({ AI_DAILY_RATE_LIMIT_PRO: undefined }, () => {
      delete process.env.AI_DAILY_RATE_LIMIT_PRO;
      assert.equal(getDailyAiLimit('pro'), 10);
      assert.equal(getDailyAiLimit('corporate'), 10);
    });
  });

  test('reads AI_DAILY_RATE_LIMIT_FREE/AI_DAILY_RATE_LIMIT_PRO when set', () => {
    withEnv({ AI_DAILY_RATE_LIMIT_FREE: '2', AI_DAILY_RATE_LIMIT_PRO: '25' }, () => {
      assert.equal(getDailyAiLimit('free'), 2);
      assert.equal(getDailyAiLimit('pro'), 25);
    });
  });
});

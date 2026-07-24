import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { estimateCostUsd, logAiUsage } from '../../src/services/costTrackingService.js';
import { pool } from '../../src/config/database.js';

describe('costTrackingService.estimateCostUsd', () => {
  test('computes cost from input/output tokens at the model rate', () => {
    const cost = estimateCostUsd('claude-sonnet-5', 1_000_000, 1_000_000);
    assert.equal(cost, 3 + 15);
  });

  test('uses cheaper haiku pricing for the haiku model', () => {
    const sonnetCost = estimateCostUsd('claude-sonnet-5', 1000, 1000);
    const haikuCost = estimateCostUsd('claude-haiku-4-5', 1000, 1000);
    assert.ok(haikuCost < sonnetCost);
  });

  test('falls back to sonnet pricing for an unknown model', () => {
    const known = estimateCostUsd('claude-sonnet-5', 1000, 1000);
    const unknown = estimateCostUsd('some-future-model', 1000, 1000);
    assert.equal(unknown, known);
  });
});

describe('costTrackingService.logAiUsage', () => {
  test('inserts a row with the estimated cost', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [] }));

    try {
      await logAiUsage({
        userId: 'user-1',
        endpoint: 'explain',
        model: 'claude-haiku-4-5',
        inputTokens: 100,
        outputTokens: 50,
        responseTimeMs: 1234,
      });

      assert.equal(queryMock.mock.calls.length, 1);
      const [sql, params] = queryMock.mock.calls[0].arguments;
      assert.match(sql, /INSERT INTO ai_usage_log/);
      assert.deepEqual(params, [
        'user-1',
        'explain',
        'claude-haiku-4-5',
        100,
        50,
        estimateCostUsd('claude-haiku-4-5', 100, 50),
        1234,
      ]);
    } finally {
      queryMock.mock.restore();
    }
  });

  test('stores null response time when not given', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [] }));

    try {
      await logAiUsage({
        userId: 'user-1',
        endpoint: 'explain',
        model: 'claude-haiku-4-5',
        inputTokens: 100,
        outputTokens: 50,
      });

      const [, params] = queryMock.mock.calls[0].arguments;
      assert.equal(params[6], null);
    } finally {
      queryMock.mock.restore();
    }
  });

  test('does not throw when the insert fails', async () => {
    const queryMock = mock.method(pool, 'query', async () => {
      throw new Error('connection refused');
    });

    try {
      await assert.doesNotReject(
        logAiUsage({
          userId: 'user-1',
          endpoint: 'explain',
          model: 'claude-haiku-4-5',
          inputTokens: 100,
          outputTokens: 50,
        }),
      );
    } finally {
      queryMock.mock.restore();
    }
  });
});

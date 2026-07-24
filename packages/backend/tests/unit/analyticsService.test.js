import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  getQuestionsPerChapter,
  getAvgResponseTimeByEndpoint,
  getSatisfactionRate,
  getCostPerUser,
} from '../../src/services/analyticsService.js';
import { pool } from '../../src/config/database.js';

describe('analyticsService.getQuestionsPerChapter', () => {
  test('maps rows to camelCase, most-asked first', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({
      rows: [
        { chapter_id: 'ch-1', title: 'Daily Standup', question_count: 5 },
        { chapter_id: 'ch-2', title: 'Deploys', question_count: 2 },
      ],
    }));

    try {
      const result = await getQuestionsPerChapter();
      assert.deepEqual(result, [
        { chapterId: 'ch-1', title: 'Daily Standup', questionCount: 5 },
        { chapterId: 'ch-2', title: 'Deploys', questionCount: 2 },
      ]);
      assert.match(queryMock.mock.calls[0].arguments[0], /GROUP BY c\.id, c\.title/);
    } finally {
      queryMock.mock.restore();
    }
  });
});

describe('analyticsService.getAvgResponseTimeByEndpoint', () => {
  test('maps rows to camelCase', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({
      rows: [{ endpoint: 'explain', avg_response_time_ms: 1500, call_count: 10 }],
    }));

    try {
      const result = await getAvgResponseTimeByEndpoint();
      assert.deepEqual(result, [{ endpoint: 'explain', avgResponseTimeMs: 1500, callCount: 10 }]);
    } finally {
      queryMock.mock.restore();
    }
  });
});

describe('analyticsService.getSatisfactionRate', () => {
  test('computes a rate from helpful/not_helpful counts', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({
      rows: [{ helpful_count: 3, not_helpful_count: 1 }],
    }));

    try {
      const result = await getSatisfactionRate();
      assert.deepEqual(result, { helpfulCount: 3, notHelpfulCount: 1, satisfactionRate: 0.75 });
    } finally {
      queryMock.mock.restore();
    }
  });

  test('returns a null rate when there is no feedback yet', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({
      rows: [{ helpful_count: 0, not_helpful_count: 0 }],
    }));

    try {
      const result = await getSatisfactionRate();
      assert.equal(result.satisfactionRate, null);
    } finally {
      queryMock.mock.restore();
    }
  });
});

describe('analyticsService.getCostPerUser', () => {
  test('maps rows to camelCase, most expensive first', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({
      rows: [{ user_id: 'u-1', email: 'a@b.com', total_cost_usd: 0.05, request_count: 12 }],
    }));

    try {
      const result = await getCostPerUser();
      assert.deepEqual(result, [
        { userId: 'u-1', email: 'a@b.com', totalCostUsd: 0.05, requestCount: 12 },
      ]);
    } finally {
      queryMock.mock.restore();
    }
  });
});

import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAudiobookCompletionRates,
  getUserRetention,
  getLifetimeValue,
} from '../../src/services/contentAnalyticsService.js';
import { LIFETIME_PRICE_BRL_CENTS } from '../../src/services/paymentService.js';
import { pool } from '../../src/config/database.js';

describe('contentAnalyticsService.getAudiobookCompletionRates', () => {
  test('maps rows to camelCase and computes a completion rate', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({
      rows: [{ audiobook_id: 'b-1', title: 'Daily Standup', users_started: 4, users_completed: 2 }],
    }));

    try {
      const result = await getAudiobookCompletionRates();
      assert.deepEqual(result, [
        {
          audiobookId: 'b-1',
          title: 'Daily Standup',
          usersStarted: 4,
          usersCompleted: 2,
          completionRate: 0.5,
        },
      ]);
    } finally {
      queryMock.mock.restore();
    }
  });

  test('returns a null completion rate when nobody has started it', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({
      rows: [{ audiobook_id: 'b-1', title: 'Unstarted', users_started: 0, users_completed: 0 }],
    }));

    try {
      const result = await getAudiobookCompletionRates();
      assert.equal(result[0].completionRate, null);
    } finally {
      queryMock.mock.restore();
    }
  });
});

describe('contentAnalyticsService.getUserRetention', () => {
  test('computes retention/churn rate from active-user counts', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({
      rows: [
        {
          previous_period_active_users: 10,
          recent_period_active_users: 8,
          retained_users: 6,
        },
      ],
    }));

    try {
      const result = await getUserRetention();
      assert.deepEqual(result, {
        previousPeriodActiveUsers: 10,
        recentPeriodActiveUsers: 8,
        retainedUsers: 6,
        retentionRate: 0.6,
        churnRate: 0.4,
      });
    } finally {
      queryMock.mock.restore();
    }
  });

  test('returns null rates when there is no prior activity to compare against', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({
      rows: [{ previous_period_active_users: 0, recent_period_active_users: 3, retained_users: 0 }],
    }));

    try {
      const result = await getUserRetention();
      assert.equal(result.retentionRate, null);
      assert.equal(result.churnRate, null);
    } finally {
      queryMock.mock.restore();
    }
  });
});

describe('contentAnalyticsService.getLifetimeValue', () => {
  test('computes conversion rate and average LTV from the real lifetime price', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({
      rows: [{ total_users: 4, paying_users: 1 }],
    }));

    try {
      const result = await getLifetimeValue();
      assert.deepEqual(result, {
        totalUsers: 4,
        payingUsers: 1,
        conversionRate: 0.25,
        totalRevenueBrlCents: LIFETIME_PRICE_BRL_CENTS,
        averageLtvBrlCents: Math.round(LIFETIME_PRICE_BRL_CENTS / 4),
      });
    } finally {
      queryMock.mock.restore();
    }
  });

  test('returns null conversion rate and zero LTV when there are no users', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({
      rows: [{ total_users: 0, paying_users: 0 }],
    }));

    try {
      const result = await getLifetimeValue();
      assert.equal(result.conversionRate, null);
      assert.equal(result.averageLtvBrlCents, 0);
    } finally {
      queryMock.mock.restore();
    }
  });
});

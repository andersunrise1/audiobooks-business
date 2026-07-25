import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { getUserPlan, isPaidPlan } from '../../src/services/planService.js';
import { pool } from '../../src/config/database.js';

describe('planService.getUserPlan', () => {
  test('returns the user plan from a fresh DB read', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [{ plan: 'pro' }] }));

    try {
      assert.equal(await getUserPlan('u1'), 'pro');
    } finally {
      queryMock.mock.restore();
    }
  });

  test('defaults to free when the user is not found', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [] }));

    try {
      assert.equal(await getUserPlan('missing'), 'free');
    } finally {
      queryMock.mock.restore();
    }
  });
});

describe('planService.isPaidPlan', () => {
  test('treats pro as paid', () => {
    assert.equal(isPaidPlan('pro'), true);
  });

  test('treats corporate as paid', () => {
    assert.equal(isPaidPlan('corporate'), true);
  });

  test('treats free as not paid', () => {
    assert.equal(isPaidPlan('free'), false);
  });

  test('treats undefined/unknown as not paid', () => {
    assert.equal(isPaidPlan(undefined), false);
    assert.equal(isPaidPlan('something-else'), false);
  });
});

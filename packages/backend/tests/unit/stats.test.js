import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreakDays } from '../../src/services/statsService.js';

function daysAgo(n) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - n);
  return date.toISOString().slice(0, 10);
}

describe('computeStreakDays', () => {
  test('no activity returns 0', () => {
    assert.equal(computeStreakDays([]), 0);
  });

  test('activity today only returns 1', () => {
    assert.equal(computeStreakDays([daysAgo(0)]), 1);
  });

  test('counts consecutive days back from today', () => {
    assert.equal(computeStreakDays([daysAgo(0), daysAgo(1), daysAgo(2)]), 3);
  });

  test('a gap stops the streak count', () => {
    assert.equal(computeStreakDays([daysAgo(0), daysAgo(2)]), 1);
  });

  test('no activity today keeps yesterday streak alive', () => {
    assert.equal(computeStreakDays([daysAgo(1), daysAgo(2)]), 2);
  });

  test('streak is broken if last activity was 2+ days ago', () => {
    assert.equal(computeStreakDays([daysAgo(2), daysAgo(3)]), 0);
  });
});

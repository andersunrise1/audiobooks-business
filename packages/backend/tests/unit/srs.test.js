import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { applySm2 } from '../../src/services/srsService.js';

describe('SM-2 spaced repetition', () => {
  test('perfect recall on a new card starts a 1-day interval', () => {
    const result = applySm2({ quality: 5, easeFactor: 2.5, intervalDays: 0, reviewCount: 0 });
    assert.equal(result.intervalDays, 1);
    assert.equal(result.reviewCount, 1);
    assert.equal(result.learningStatus, 'learning');
  });

  test('second successful review jumps to a 6-day interval', () => {
    const result = applySm2({ quality: 4, easeFactor: 2.6, intervalDays: 1, reviewCount: 1 });
    assert.equal(result.intervalDays, 6);
    assert.equal(result.reviewCount, 2);
  });

  test('low quality resets progress to a 1-day interval and "new" status', () => {
    const result = applySm2({ quality: 1, easeFactor: 2.5, intervalDays: 16, reviewCount: 3 });
    assert.equal(result.reviewCount, 0);
    assert.equal(result.intervalDays, 1);
    assert.equal(result.learningStatus, 'new');
  });

  test('ease factor never drops below 1.3', () => {
    let state = { easeFactor: 2.5, intervalDays: 0, reviewCount: 0 };
    for (let i = 0; i < 20; i += 1) {
      state = applySm2({ quality: 0, ...state });
    }
    assert.ok(state.easeFactor >= 1.3);
  });

  test('a long enough interval marks the card as mastered', () => {
    const result = applySm2({ quality: 5, easeFactor: 2.8, intervalDays: 10, reviewCount: 3 });
    assert.ok(result.intervalDays >= 21);
    assert.equal(result.learningStatus, 'mastered');
  });
});

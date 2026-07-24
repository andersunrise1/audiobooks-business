import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { scorePronunciation } from '../../src/services/pronunciationScoreService.js';

describe('pronunciationScoreService.scorePronunciation', () => {
  test('scores 100% when every word is recognized', () => {
    const { score } = scorePronunciation(
      'We need to optimize the query.',
      'we need to optimize the query',
    );
    assert.equal(score, 100);
  });

  test('scores partial matches proportionally', () => {
    const { score } = scorePronunciation(
      'We need to optimize the query.',
      'we need optimize query',
    );
    assert.equal(score, 67);
  });

  test('scores 0% for an empty transcript', () => {
    const { score } = scorePronunciation('We need to optimize the query.', '');
    assert.equal(score, 0);
  });

  test('is case-insensitive and ignores punctuation', () => {
    const { matchedWords, unmatchedWords } = scorePronunciation('Deployed!', 'DEPLOYED');
    assert.deepEqual(matchedWords, ['deployed']);
    assert.deepEqual(unmatchedWords, []);
  });

  test('splits matched and unmatched words correctly', () => {
    const { matchedWords, unmatchedWords } = scorePronunciation(
      'We need to optimize the query.',
      'we need optimize query',
    );
    assert.deepEqual(matchedWords.sort(), ['need', 'optimize', 'query', 'we'].sort());
    assert.deepEqual(unmatchedWords, ['to', 'the']);
  });
});

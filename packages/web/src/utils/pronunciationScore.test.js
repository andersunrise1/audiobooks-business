import { describe, expect, test } from 'vitest';
import { scorePronunciation } from './pronunciationScore.js';

describe('scorePronunciation', () => {
  test('scores 100% when every word is recognized', () => {
    const { score } = scorePronunciation(
      'We need to optimize the query.',
      'we need to optimize the query',
    );
    expect(score).toBe(100);
  });

  test('scores partial matches proportionally', () => {
    const { score } = scorePronunciation(
      'We need to optimize the query.',
      'we need optimize query',
    );
    expect(score).toBe(67);
  });

  test('scores 0% for an empty transcript', () => {
    const { score } = scorePronunciation('We need to optimize the query.', '');
    expect(score).toBe(0);
  });

  test('is case-insensitive and ignores punctuation', () => {
    const { matchedWords } = scorePronunciation('Deployed!', 'DEPLOYED');
    expect(matchedWords.has('deployed')).toBe(true);
  });
});

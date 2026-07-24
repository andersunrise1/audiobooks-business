import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVoiceCommand } from '../../src/services/voiceCommandService.js';

describe('voiceCommandService.parseVoiceCommand', () => {
  test('parses "Explain X"', () => {
    assert.deepEqual(parseVoiceCommand('Explain deployed'), {
      intent: 'explain',
      word: 'deployed',
    });
  });

  test('parses "what does X mean"', () => {
    assert.deepEqual(parseVoiceCommand('What does rollback mean?'), {
      intent: 'explain',
      word: 'rollback',
    });
  });

  test('parses "what is X"', () => {
    assert.deepEqual(parseVoiceCommand('What is CI/CD'), { intent: 'explain', word: 'ci/cd' });
  });

  test('parses multi-word terms after "explain"', () => {
    assert.deepEqual(parseVoiceCommand('explain continuous integration'), {
      intent: 'explain',
      word: 'continuous integration',
    });
  });

  test('parses "play next chapter"', () => {
    assert.deepEqual(parseVoiceCommand('Play next chapter'), { intent: 'next_chapter' });
  });

  test('parses "next chapter" without "play"', () => {
    assert.deepEqual(parseVoiceCommand('next chapter'), { intent: 'next_chapter' });
  });

  test('parses "check my progress"', () => {
    assert.deepEqual(parseVoiceCommand('Check my progress'), { intent: 'progress' });
  });

  test('parses "my progress" without "check"', () => {
    assert.deepEqual(parseVoiceCommand('my progress'), { intent: 'progress' });
  });

  test('is case-insensitive and tolerates trailing punctuation', () => {
    assert.deepEqual(parseVoiceCommand('CHECK MY PROGRESS!'), { intent: 'progress' });
  });

  test('returns unknown for unrelated speech', () => {
    assert.deepEqual(parseVoiceCommand('hello there'), { intent: 'unknown' });
  });
});

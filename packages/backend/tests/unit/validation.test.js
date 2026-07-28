import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmail, isValidPassword, MIN_PASSWORD_LENGTH } from '../../src/utils/validation.js';

describe('isValidEmail', () => {
  test('accepts a well-formed email', () => {
    assert.equal(isValidEmail('ander@techspeak.dev'), true);
  });

  test('rejects a string with no @', () => {
    assert.equal(isValidEmail('not-an-email'), false);
  });

  test('rejects a string with no domain', () => {
    assert.equal(isValidEmail('ander@'), false);
  });

  test('rejects non-string values', () => {
    assert.equal(isValidEmail(undefined), false);
    assert.equal(isValidEmail(null), false);
    assert.equal(isValidEmail(42), false);
  });
});

describe('isValidPassword', () => {
  test(`accepts a password at least ${MIN_PASSWORD_LENGTH} characters long`, () => {
    assert.equal(isValidPassword('a'.repeat(MIN_PASSWORD_LENGTH)), true);
  });

  test('rejects a password shorter than the minimum', () => {
    assert.equal(isValidPassword('short'), false);
  });

  test('rejects non-string values', () => {
    assert.equal(isValidPassword(undefined), false);
    assert.equal(isValidPassword(12345678), false);
  });
});

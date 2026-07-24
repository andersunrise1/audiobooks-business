import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  getExplainFallback,
  getChatFallback,
  getRemedialFallback,
  SUPPORT_CONTACT_EMAIL,
  EXTERNAL_DOCS_URL,
} from '../../src/services/aiFallbackService.js';
import { pool } from '../../src/config/database.js';

describe('aiFallbackService.getExplainFallback', () => {
  test('falls back to the technical dictionary when the word is found', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({
      rows: [
        {
          word: 'deployed',
          technical_explanation: 'Colocar codigo em producao.',
          portuguese_translation: 'implantado',
        },
      ],
    }));

    try {
      const result = await getExplainFallback('deployed');
      assert.equal(result.fallback, true);
      assert.equal(result.source, 'dictionary');
      assert.match(result.explanation, /Colocar codigo em producao/);
      assert.match(result.explanation, /implantado/);
      assert.equal(result.supportContact, SUPPORT_CONTACT_EMAIL);
      assert.equal(result.externalDocsUrl, EXTERNAL_DOCS_URL);
      assert.ok(result.faq.length > 0);
    } finally {
      queryMock.mock.restore();
    }
  });

  test('falls back to the generic FAQ when the word is not in the dictionary either', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [] }));

    try {
      const result = await getExplainFallback('notarealword');
      assert.equal(result.source, 'faq');
      assert.equal(result.explanation, null);
    } finally {
      queryMock.mock.restore();
    }
  });
});

describe('aiFallbackService.getChatFallback', () => {
  test('returns a fallback reply with FAQ/docs/support', () => {
    const result = getChatFallback();
    assert.equal(result.fallback, true);
    assert.equal(typeof result.reply, 'string');
    assert.ok(result.faq.length > 0);
    assert.equal(result.supportContact, SUPPORT_CONTACT_EMAIL);
  });
});

describe('aiFallbackService.getRemedialFallback', () => {
  test('returns a fallback summary matching the normal remedial shape', () => {
    const result = getRemedialFallback();
    assert.equal(result.fallback, true);
    assert.equal(typeof result.summary, 'string');
    assert.deepEqual(result.keywords, []);
    assert.equal(result.exercise, '');
    assert.ok(result.faq.length > 0);
  });
});

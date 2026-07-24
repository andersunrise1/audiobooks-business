import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  explainTechnicalTerm,
  chatReply,
  getRemedialContent,
  explainCacheKey,
  remedialCacheKey,
  invalidateExplainCache,
  invalidateRemedialCache,
  client,
} from '../../src/services/aiService.js';
import { redisClient } from '../../src/config/redis.js';

describe('aiService.explainTechnicalTerm', () => {
  test('sends the word and context to the model and returns the text response', async () => {
    const createMock = mock.method(client.messages, 'create', async () => ({
      content: [{ type: 'text', text: 'Deployed significa colocar em producao.' }],
    }));

    try {
      const result = await explainTechnicalTerm('deployed', 'a CI/CD pipeline');

      assert.equal(result, 'Deployed significa colocar em producao.');
      assert.equal(createMock.mock.calls.length, 1);

      const [requestArgs] = createMock.mock.calls[0].arguments;
      assert.match(requestArgs.messages[0].content, /deployed/);
      assert.match(requestArgs.messages[0].content, /CI\/CD pipeline/);
    } finally {
      createMock.mock.restore();
    }
  });

  test('returns an empty string when the response has no text content block', async () => {
    const createMock = mock.method(client.messages, 'create', async () => ({ content: [] }));

    try {
      const result = await explainTechnicalTerm('deployed', 'context');
      assert.equal(result, '');
    } finally {
      createMock.mock.restore();
    }
  });
});

describe('aiService.chatReply', () => {
  test('forwards the message history to the model and returns the text response', async () => {
    const createMock = mock.method(client.messages, 'create', async () => ({
      content: [{ type: 'text', text: 'Claro, posso te ajudar com isso.' }],
    }));

    try {
      const history = [
        { role: 'user', content: 'O que significa "deployed"?' },
        { role: 'assistant', content: 'Significa colocar em producao.' },
        { role: 'user', content: 'E "rollback"?' },
      ];

      const result = await chatReply(history);

      assert.equal(result, 'Claro, posso te ajudar com isso.');
      assert.equal(createMock.mock.calls.length, 1);

      const [requestArgs] = createMock.mock.calls[0].arguments;
      assert.deepEqual(requestArgs.messages, history);
    } finally {
      createMock.mock.restore();
    }
  });

  test('returns an empty string when the response has no text content block', async () => {
    const createMock = mock.method(client.messages, 'create', async () => ({ content: [] }));

    try {
      const result = await chatReply([{ role: 'user', content: 'oi' }]);
      assert.equal(result, '');
    } finally {
      createMock.mock.restore();
    }
  });

  test('folds context into the system prompt when provided', async () => {
    const createMock = mock.method(client.messages, 'create', async () => ({
      content: [{ type: 'text', text: 'ok' }],
    }));

    try {
      await chatReply([{ role: 'user', content: 'oi' }], 'Capitulo atual: "Daily Standup".');

      const [requestArgs] = createMock.mock.calls[0].arguments;
      assert.match(requestArgs.system, /Daily Standup/);
    } finally {
      createMock.mock.restore();
    }
  });

  test('uses the base system prompt when no context is given', async () => {
    const createMock = mock.method(client.messages, 'create', async () => ({
      content: [{ type: 'text', text: 'ok' }],
    }));

    try {
      await chatReply([{ role: 'user', content: 'oi' }]);

      const [requestArgs] = createMock.mock.calls[0].arguments;
      assert.doesNotMatch(requestArgs.system, /Contexto do que o aluno/);
    } finally {
      createMock.mock.restore();
    }
  });
});

describe('aiService.getRemedialContent', () => {
  test('parses a well-formed JSON response into summary/keywords/exercise', async () => {
    const createMock = mock.method(client.messages, 'create', async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            summary: 'O capitulo fala sobre deploys diarios.',
            keywords: ['deploy', 'rollback', 'standup'],
            exercise: 'Write a sentence using "deployed".',
          }),
        },
      ],
    }));

    try {
      const result = await getRemedialContent('Yesterday I deployed a new version.');

      assert.equal(result.summary, 'O capitulo fala sobre deploys diarios.');
      assert.deepEqual(result.keywords, ['deploy', 'rollback', 'standup']);
      assert.equal(result.exercise, 'Write a sentence using "deployed".');

      const [requestArgs] = createMock.mock.calls[0].arguments;
      assert.match(requestArgs.messages[0].content, /Yesterday I deployed a new version\./);
    } finally {
      createMock.mock.restore();
    }
  });

  test('falls back to raw text as summary when the response is not valid JSON', async () => {
    const createMock = mock.method(client.messages, 'create', async () => ({
      content: [{ type: 'text', text: 'nao consigo gerar isso agora' }],
    }));

    try {
      const result = await getRemedialContent('some transcript');

      assert.equal(result.summary, 'nao consigo gerar isso agora');
      assert.deepEqual(result.keywords, []);
      assert.equal(result.exercise, '');
    } finally {
      createMock.mock.restore();
    }
  });
});

describe('aiService cache key builders', () => {
  test('explainCacheKey is stable for the same word/context and lowercases the word', () => {
    const a = explainCacheKey('Deployed', 'a CI/CD pipeline');
    const b = explainCacheKey('deployed', 'a CI/CD pipeline');
    assert.equal(a, b);
    assert.match(a, /^ai:explain:deployed:/);
  });

  test('explainCacheKey differs for different context', () => {
    const a = explainCacheKey('deployed', 'a CI/CD pipeline');
    const b = explainCacheKey('deployed', 'a different sentence');
    assert.notEqual(a, b);
  });

  test('remedialCacheKey is namespaced by chapterId', () => {
    assert.equal(remedialCacheKey('abc-123'), 'ai:remedial:abc-123');
  });
});

describe('aiService cache invalidation', () => {
  test('invalidateExplainCache deletes the same key explainWord would cache under', async () => {
    const connectMock = mock.method(redisClient, 'connect', async () => {});
    const delMock = mock.method(redisClient, 'del', async () => 1);

    try {
      await invalidateExplainCache('deployed', 'a CI/CD pipeline');
      assert.equal(
        delMock.mock.calls[0].arguments[0],
        explainCacheKey('deployed', 'a CI/CD pipeline'),
      );
    } finally {
      connectMock.mock.restore();
      delMock.mock.restore();
    }
  });

  test('invalidateRemedialCache deletes the same key the remedial endpoint would cache under', async () => {
    const connectMock = mock.method(redisClient, 'connect', async () => {});
    const delMock = mock.method(redisClient, 'del', async () => 1);

    try {
      await invalidateRemedialCache('chapter-123');
      assert.equal(delMock.mock.calls[0].arguments[0], remedialCacheKey('chapter-123'));
    } finally {
      connectMock.mock.restore();
      delMock.mock.restore();
    }
  });
});

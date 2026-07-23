import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { explainTechnicalTerm, chatReply, client } from '../../src/services/aiService.js';

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
});

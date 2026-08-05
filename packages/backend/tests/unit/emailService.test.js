import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { isEmailConfigured, sendSupportReply } from '../../src/services/emailService.js';
import { resendClient } from '../../src/config/resend.js';

function withEnv(vars, fn) {
  const originals = {};
  for (const key of Object.keys(vars)) {
    originals[key] = process.env[key];
    if (vars[key] === undefined) delete process.env[key];
    else process.env[key] = vars[key];
  }

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const key of Object.keys(originals)) {
        if (originals[key] === undefined) delete process.env[key];
        else process.env[key] = originals[key];
      }
    });
}

describe('emailService.isEmailConfigured', () => {
  test('is false when RESEND_API_KEY is unset', async () => {
    await withEnv({ RESEND_API_KEY: undefined }, () => {
      assert.equal(isEmailConfigured(), false);
    });
  });

  test('is true when RESEND_API_KEY is set', async () => {
    await withEnv({ RESEND_API_KEY: 're_test_123' }, () => {
      assert.equal(isEmailConfigured(), true);
    });
  });
});

describe('emailService.sendSupportReply', () => {
  test('sends the admin response from the support address, quoting the original message', async () => {
    const sendMock = mock.method(resendClient.emails, 'send', async () => ({ data: { id: 'x' } }));

    try {
      await sendSupportReply({
        to: 'user@example.com',
        subject: 'Dúvida sobre preço',
        message: 'O Vitalício cobre livros futuros?',
        adminResponse: 'Sim, cobre!',
      });

      const [args] = sendMock.mock.calls[0].arguments;
      assert.equal(args.to, 'user@example.com');
      assert.equal(args.subject, 'Re: Dúvida sobre preço');
      assert.match(args.from, /suporte@techspeaking\.dev/);
      assert.match(args.text, /Sim, cobre!/);
      assert.match(args.text, /O Vitalício cobre livros futuros\?/);
    } finally {
      sendMock.mock.restore();
    }
  });
});

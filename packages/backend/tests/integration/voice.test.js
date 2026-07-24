import { after, before, describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/config/database.js';
import { client } from '../../src/services/aiService.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('POST /api/voice/command', () => {
  let server;
  let baseUrl;
  let accessToken;
  let userId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
    const registered = await registerTestUser(baseUrl);
    accessToken = registered.accessToken;
    userId = registered.user.id;
  });

  after(async () => {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await stopTestServer(server);
  });

  async function sendCommand(transcript) {
    return fetch(`${baseUrl}/api/voice/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ transcript }),
    });
  }

  test('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/voice/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'next chapter' }),
    });
    assert.equal(res.status, 401);
  });

  test('rejects a request with no transcript', async () => {
    const res = await sendCommand('');
    assert.equal(res.status, 400);
  });

  test('"next chapter" resolves without needing an AI key', async () => {
    const res = await sendCommand('Play next chapter');
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.deepEqual(data, { intent: 'next_chapter' });
  });

  test('"check my progress" returns real stats without needing an AI key', async () => {
    const res = await sendCommand('Check my progress');
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.intent, 'progress');
    assert.equal(typeof data.stats.streakDays, 'number');
    assert.equal(typeof data.stats.flashcardsDue, 'number');
  });

  test('unrecognized speech resolves to an unknown intent', async () => {
    const res = await sendCommand('what a nice day');
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.intent, 'unknown');
  });

  test('"explain X" returns 503 when ANTHROPIC_API_KEY is not configured', async () => {
    assert.ok(!process.env.ANTHROPIC_API_KEY);

    const res = await sendCommand('Explain deployed');
    assert.equal(res.status, 503);

    const data = await res.json();
    assert.match(data.error, /ANTHROPIC_API_KEY/);
  });

  test('"explain X" falls back to the technical dictionary when the AI call fails (Dia 39)', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-key-for-fallback-tests';
    const createMock = mock.method(client.messages, 'create', async () => {
      throw new Error('simulated Anthropic outage');
    });

    try {
      const res = await sendCommand('Explain deployed');
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.intent, 'explain');
      assert.equal(data.fallback, true);
      assert.equal(data.source, 'dictionary');
    } finally {
      createMock.mock.restore();
      process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });
});

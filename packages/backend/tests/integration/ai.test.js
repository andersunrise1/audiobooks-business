import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/config/database.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('AI explanation endpoint', () => {
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

  test('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'deployed', context: 'a CI/CD pipeline' }),
    });
    assert.equal(res.status, 401);
  });

  test('rejects a request missing word or context', async () => {
    const res = await fetch(`${baseUrl}/api/ai/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ word: 'deployed' }),
    });
    assert.equal(res.status, 400);
  });

  test('returns 503 when ANTHROPIC_API_KEY is not configured', async () => {
    // This environment genuinely has no ANTHROPIC_API_KEY configured, so
    // this exercises the real guard rather than a mocked one.
    assert.ok(!process.env.ANTHROPIC_API_KEY);

    const res = await fetch(`${baseUrl}/api/ai/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ word: 'deployed', context: 'a CI/CD pipeline' }),
    });

    assert.equal(res.status, 503);
    const data = await res.json();
    assert.match(data.error, /ANTHROPIC_API_KEY/);
  });
});

describe('AI chat endpoint', () => {
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

  test('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'oi' }] }),
    });
    assert.equal(res.status, 401);
  });

  test('rejects a request with no messages', async () => {
    const res = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ messages: [] }),
    });
    assert.equal(res.status, 400);
  });

  test('returns 503 when ANTHROPIC_API_KEY is not configured', async () => {
    assert.ok(!process.env.ANTHROPIC_API_KEY);

    const res = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'oi' }] }),
    });

    assert.equal(res.status, 503);
    const data = await res.json();
    assert.match(data.error, /ANTHROPIC_API_KEY/);
  });
});

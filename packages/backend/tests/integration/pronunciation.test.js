import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/config/database.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('POST /api/pronunciation/score', () => {
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
    const res = await fetch(`${baseUrl}/api/pronunciation/score`, { method: 'POST' });
    assert.equal(res.status, 401);
  });

  test('rejects a request with no audio file', async () => {
    const form = new FormData();
    form.append('targetSentence', 'We need to optimize the query.');

    const res = await fetch(`${baseUrl}/api/pronunciation/score`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
    assert.equal(res.status, 400);
  });

  test('rejects a request with no targetSentence', async () => {
    const form = new FormData();
    form.append('audio', new Blob([Buffer.from('fake-audio')]), 'recording.webm');

    const res = await fetch(`${baseUrl}/api/pronunciation/score`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
    assert.equal(res.status, 400);
  });

  test('returns 503 when DEEPGRAM_API_KEY is not configured', async () => {
    assert.ok(!process.env.DEEPGRAM_API_KEY);

    const form = new FormData();
    form.append('targetSentence', 'We need to optimize the query.');
    form.append('audio', new Blob([Buffer.from('fake-audio')]), 'recording.webm');

    const res = await fetch(`${baseUrl}/api/pronunciation/score`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });

    assert.equal(res.status, 503);
    const data = await res.json();
    assert.match(data.error, /DEEPGRAM_API_KEY/);
  });
});

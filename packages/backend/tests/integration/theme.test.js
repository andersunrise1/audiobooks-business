import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/config/database.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('PATCH /api/user/theme', () => {
  let server;
  let baseUrl;
  let accessToken;
  let userId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
    const { user, accessToken: token } = await registerTestUser(baseUrl);
    accessToken = token;
    userId = user.id;
  });

  after(async () => {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await stopTestServer(server);
  });

  test('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/user/theme`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryColor: 'purple', fontSize: 'large' }),
    });
    assert.equal(res.status, 401);
  });

  test('defaults a fresh user to blue/medium', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    assert.equal(data.user.themePrimaryColor, 'blue');
    assert.equal(data.user.themeFontSize, 'medium');
  });

  test('rejects an unknown primaryColor', async () => {
    const res = await fetch(`${baseUrl}/api/user/theme`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ primaryColor: 'chartreuse', fontSize: 'medium' }),
    });
    assert.equal(res.status, 400);
  });

  test('rejects an unknown fontSize', async () => {
    const res = await fetch(`${baseUrl}/api/user/theme`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ primaryColor: 'blue', fontSize: 'huge' }),
    });
    assert.equal(res.status, 400);
  });

  test('persists a valid preference and returns it', async () => {
    const res = await fetch(`${baseUrl}/api/user/theme`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ primaryColor: 'purple', fontSize: 'large' }),
    });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.user.themePrimaryColor, 'purple');
    assert.equal(data.user.themeFontSize, 'large');

    const { rows } = await pool.query(
      'SELECT theme_primary_color, theme_font_size FROM users WHERE id = $1',
      [userId],
    );
    assert.equal(rows[0].theme_primary_color, 'purple');
    assert.equal(rows[0].theme_font_size, 'large');
  });
});

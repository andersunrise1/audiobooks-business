import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/config/database.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('Beta Tester Program (Dia 76-77)', () => {
  let server;
  let baseUrl;
  let adminAccessToken;
  let adminUserId;
  let plainAccessToken;
  let plainUserId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());

    const admin = await registerTestUser(baseUrl);
    adminAccessToken = admin.accessToken;
    adminUserId = admin.user.id;
    await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [adminUserId]);

    const plain = await registerTestUser(baseUrl);
    plainAccessToken = plain.accessToken;
    plainUserId = plain.user.id;
  });

  after(async () => {
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [[adminUserId, plainUserId]]);
    await stopTestServer(server);
  });

  describe('PATCH /api/admin/users/:id/beta-tester', () => {
    test('rejects unauthenticated requests', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${plainUserId}/beta-tester`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBetaTester: true }),
      });
      assert.equal(res.status, 401);
    });

    test('rejects a non-admin caller', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${plainUserId}/beta-tester`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${plainAccessToken}`,
        },
        body: JSON.stringify({ isBetaTester: true }),
      });
      assert.equal(res.status, 403);
    });

    test('rejects a non-boolean isBetaTester', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${plainUserId}/beta-tester`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAccessToken}`,
        },
        body: JSON.stringify({ isBetaTester: 'yes' }),
      });
      assert.equal(res.status, 400);
    });

    test('returns 404 for a user that does not exist', async () => {
      const res = await fetch(
        `${baseUrl}/api/admin/users/00000000-0000-0000-0000-000000000000/beta-tester`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminAccessToken}`,
          },
          body: JSON.stringify({ isBetaTester: true }),
        },
      );
      assert.equal(res.status, 404);
    });

    test('granting beta status also grants free Pro access', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${plainUserId}/beta-tester`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAccessToken}`,
        },
        body: JSON.stringify({ isBetaTester: true }),
      });
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.isBetaTester, true);
      assert.equal(data.plan, 'pro');

      const { rows } = await pool.query('SELECT plan, is_beta_tester FROM users WHERE id = $1', [
        plainUserId,
      ]);
      assert.equal(rows[0].plan, 'pro');
      assert.equal(rows[0].is_beta_tester, true);
    });

    test('revoking beta status does not revert plan (no purchase history to check against)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${plainUserId}/beta-tester`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAccessToken}`,
        },
        body: JSON.stringify({ isBetaTester: false }),
      });
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.isBetaTester, false);
      assert.equal(data.plan, 'pro');
    });
  });

  describe('POST /api/beta/feedback', () => {
    test('rejects unauthenticated requests', async () => {
      const res = await fetch(`${baseUrl}/api/beta/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'bug', message: 'It broke' }),
      });
      assert.equal(res.status, 401);
    });

    test('rejects an invalid category', async () => {
      const res = await fetch(`${baseUrl}/api/beta/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${plainAccessToken}`,
        },
        body: JSON.stringify({ category: 'not-a-real-category', message: 'It broke' }),
      });
      assert.equal(res.status, 400);
    });

    test('rejects a missing message', async () => {
      const res = await fetch(`${baseUrl}/api/beta/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${plainAccessToken}`,
        },
        body: JSON.stringify({ category: 'general' }),
      });
      assert.equal(res.status, 400);
    });

    test('rejects a rating outside 1-5', async () => {
      const res = await fetch(`${baseUrl}/api/beta/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${plainAccessToken}`,
        },
        body: JSON.stringify({ category: 'general', message: 'Nice app', rating: 9 }),
      });
      assert.equal(res.status, 400);
    });

    test('accepts real feedback and persists it', async () => {
      const res = await fetch(`${baseUrl}/api/beta/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${plainAccessToken}`,
        },
        body: JSON.stringify({
          category: 'bug',
          message: 'The audio player skips on Chrome',
          rating: 3,
        }),
      });
      assert.equal(res.status, 201);

      const data = await res.json();
      assert.equal(data.category, 'bug');
      assert.equal(data.rating, 3);

      const { rows } = await pool.query('SELECT * FROM beta_feedback WHERE id = $1', [data.id]);
      assert.equal(rows[0].user_id, plainUserId);
      assert.equal(rows[0].message, 'The audio player skips on Chrome');
    });
  });

  describe('GET /api/admin/beta-feedback', () => {
    test('rejects a non-admin caller', async () => {
      const res = await fetch(`${baseUrl}/api/admin/beta-feedback`, {
        headers: { Authorization: `Bearer ${plainAccessToken}` },
      });
      assert.equal(res.status, 403);
    });

    test('returns submitted feedback for an admin, including the submitter', async () => {
      await fetch(`${baseUrl}/api/beta/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${plainAccessToken}`,
        },
        body: JSON.stringify({
          category: 'feature_request',
          message: 'Add dark mode to PDF export',
        }),
      });

      const res = await fetch(`${baseUrl}/api/admin/beta-feedback`, {
        headers: { Authorization: `Bearer ${adminAccessToken}` },
      });
      assert.equal(res.status, 200);

      const data = await res.json();
      const found = data.find((f) => f.message === 'Add dark mode to PDF export');
      assert.ok(found);
      assert.equal(found.category, 'feature_request');
      assert.ok(found.user.email.length > 0);
    });
  });
});

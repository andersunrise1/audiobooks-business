import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/config/database.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('GET /api/experiments/:name/assignment', () => {
  let server;
  let baseUrl;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
  });

  after(async () => {
    await stopTestServer(server);
  });

  test('rejects a request missing subjectId', async () => {
    const res = await fetch(`${baseUrl}/api/experiments/pricing_price/assignment`);
    assert.equal(res.status, 400);
  });

  test('returns 404 for an unknown experiment', async () => {
    const res = await fetch(
      `${baseUrl}/api/experiments/not_real/assignment?subjectId=${randomUUID()}`,
    );
    assert.equal(res.status, 404);
  });

  test('returns a stable variant + config for the same subject across repeat calls', async () => {
    const subjectId = randomUUID();
    const first = await fetch(
      `${baseUrl}/api/experiments/pricing_price/assignment?subjectId=${subjectId}`,
    ).then((r) => r.json());
    const second = await fetch(
      `${baseUrl}/api/experiments/pricing_price/assignment?subjectId=${subjectId}`,
    ).then((r) => r.json());

    assert.equal(first.experiment, 'pricing_price');
    assert.ok(['control', 'discount'].includes(first.variant));
    assert.equal(first.variant, second.variant);
    assert.deepEqual(first.config, second.config);
  });

  test('logs exactly one exposure event even across repeat calls', async () => {
    const subjectId = randomUUID();
    await fetch(`${baseUrl}/api/experiments/pricing_price/assignment?subjectId=${subjectId}`);
    await fetch(`${baseUrl}/api/experiments/pricing_price/assignment?subjectId=${subjectId}`);
    await fetch(`${baseUrl}/api/experiments/pricing_price/assignment?subjectId=${subjectId}`);

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM experiment_events WHERE subject_id = $1 AND event_type = 'exposure'`,
      [subjectId],
    );
    assert.equal(rows[0].count, 1);
  });
});

describe('POST /api/experiments/:name/conversion', () => {
  let server;
  let baseUrl;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
  });

  after(async () => {
    await stopTestServer(server);
  });

  test('rejects a request missing subjectId or variant', async () => {
    const res = await fetch(`${baseUrl}/api/experiments/pricing_price/conversion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });

  test('rejects an unknown variant', async () => {
    const res = await fetch(`${baseUrl}/api/experiments/pricing_price/conversion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId: randomUUID(), variant: 'not-a-variant' }),
    });
    assert.equal(res.status, 404);
  });

  test('records a conversion event', async () => {
    const subjectId = randomUUID();
    const res = await fetch(`${baseUrl}/api/experiments/paywall_message/conversion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId, variant: 'benefit', metadata: { clicked: 'ver_planos' } }),
    });
    assert.equal(res.status, 201);

    const { rows } = await pool.query(
      `SELECT variant, metadata FROM experiment_events WHERE subject_id = $1 AND event_type = 'conversion'`,
      [subjectId],
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].variant, 'benefit');
    assert.equal(rows[0].metadata.clicked, 'ver_planos');
  });
});

describe('Admin experiment endpoints', () => {
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
    await pool.query('DELETE FROM users WHERE id = $1', [adminUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [plainUserId]);
    await stopTestServer(server);
  });

  test('GET /api/admin/experiments rejects a non-admin user', async () => {
    const res = await fetch(`${baseUrl}/api/admin/experiments`, {
      headers: { Authorization: `Bearer ${plainAccessToken}` },
    });
    assert.equal(res.status, 403);
  });

  test('GET /api/admin/experiments lists the configured experiments', async () => {
    const res = await fetch(`${baseUrl}/api/admin/experiments`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    const pricing = data.find((e) => e.name === 'pricing_price');
    assert.deepEqual(pricing.variants.sort(), ['control', 'discount']);
  });

  test('GET /api/admin/experiments/:name/results returns 404 for an unknown experiment', async () => {
    const res = await fetch(`${baseUrl}/api/admin/experiments/not_real/results`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert.equal(res.status, 404);
  });

  test('GET /api/admin/experiments/:name/results reflects real exposure/conversion events', async () => {
    const subjectId = randomUUID();
    const assignment = await fetch(
      `${baseUrl}/api/experiments/paywall_message/assignment?subjectId=${subjectId}`,
    ).then((r) => r.json());

    await fetch(`${baseUrl}/api/experiments/paywall_message/conversion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId, variant: assignment.variant }),
    });

    const res = await fetch(`${baseUrl}/api/admin/experiments/paywall_message/results`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    const row = data.results.find((r) => r.variant === assignment.variant);
    assert.ok(row.exposures >= 1);
    assert.ok(row.conversions >= 1);
  });
});

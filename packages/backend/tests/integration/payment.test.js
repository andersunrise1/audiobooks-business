import { after, before, describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/config/database.js';
import { stripeClient } from '../../src/config/stripe.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

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

describe('POST /api/payment/create-checkout-session', () => {
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
    const res = await fetch(`${baseUrl}/api/payment/create-checkout-session`, { method: 'POST' });
    assert.equal(res.status, 401);
  });

  test('returns 503 when Stripe is not configured', async () => {
    assert.ok(!process.env.STRIPE_SECRET_KEY);

    const res = await fetch(`${baseUrl}/api/payment/create-checkout-session`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    assert.equal(res.status, 503);
    const data = await res.json();
    assert.match(data.error, /STRIPE_SECRET_KEY/);
  });

  test('creates a checkout session and returns its URL', async () => {
    const createMock = mock.method(stripeClient.checkout.sessions, 'create', async () => ({
      url: 'https://checkout.stripe.com/test-session',
    }));

    try {
      await withEnv({ STRIPE_SECRET_KEY: 'sk_test_fake' }, async () => {
        const res = await fetch(`${baseUrl}/api/payment/create-checkout-session`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.url, 'https://checkout.stripe.com/test-session');

        const [args] = createMock.mock.calls[0].arguments;
        assert.equal(args.metadata.userId, userId);
      });
    } finally {
      createMock.mock.restore();
    }
  });

  test('rejects a user who already has lifetime access', async () => {
    await pool.query(`UPDATE users SET plan = 'pro' WHERE id = $1`, [userId]);

    try {
      await withEnv({ STRIPE_SECRET_KEY: 'sk_test_fake' }, async () => {
        const res = await fetch(`${baseUrl}/api/payment/create-checkout-session`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        assert.equal(res.status, 400);
      });
    } finally {
      await pool.query(`UPDATE users SET plan = 'free' WHERE id = $1`, [userId]);
    }
  });
});

describe('POST /api/payment/webhook', () => {
  let server;
  let baseUrl;
  let userId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
  });

  after(async () => {
    if (userId) await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await stopTestServer(server);
  });

  function postWebhook(body) {
    return fetch(`${baseUrl}/api/payment/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 'test-signature' },
      body: JSON.stringify(body),
    });
  }

  test('returns 503 when the webhook secret is not configured', async () => {
    assert.ok(!process.env.STRIPE_WEBHOOK_SECRET);

    const res = await postWebhook({ type: 'checkout.session.completed' });
    assert.equal(res.status, 503);
  });

  test('rejects an invalid signature', async () => {
    const constructMock = mock.method(stripeClient.webhooks, 'constructEvent', () => {
      throw new Error('signature mismatch');
    });

    try {
      await withEnv({ STRIPE_WEBHOOK_SECRET: 'whsec_test' }, async () => {
        const res = await postWebhook({ type: 'checkout.session.completed' });
        assert.equal(res.status, 400);
      });
    } finally {
      constructMock.mock.restore();
    }
  });

  test('grants lifetime access on a real checkout.session.completed event', async () => {
    const registered = await registerTestUser(baseUrl);
    userId = registered.user.id;

    const constructMock = mock.method(stripeClient.webhooks, 'constructEvent', () => ({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_123', metadata: { userId } } },
    }));

    try {
      await withEnv({ STRIPE_WEBHOOK_SECRET: 'whsec_test' }, async () => {
        const res = await postWebhook({});
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.received, true);
      });

      const { rows } = await pool.query('SELECT plan FROM users WHERE id = $1', [userId]);
      assert.equal(rows[0].plan, 'pro');
    } finally {
      constructMock.mock.restore();
    }
  });

  test('ignores unrelated event types without touching the database', async () => {
    const registered = await registerTestUser(baseUrl);
    const otherUserId = registered.user.id;

    const constructMock = mock.method(stripeClient.webhooks, 'constructEvent', () => ({
      type: 'payment_intent.created',
      data: { object: {} },
    }));

    try {
      await withEnv({ STRIPE_WEBHOOK_SECRET: 'whsec_test' }, async () => {
        const res = await postWebhook({});
        assert.equal(res.status, 200);
      });

      const { rows } = await pool.query('SELECT plan FROM users WHERE id = $1', [otherUserId]);
      assert.equal(rows[0].plan, 'free');
    } finally {
      constructMock.mock.restore();
      await pool.query('DELETE FROM users WHERE id = $1', [otherUserId]);
    }
  });
});

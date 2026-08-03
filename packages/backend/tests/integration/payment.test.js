import { after, before, describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
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

  test('charges the pricing_price variant price for the given subjectId (Dia 55-56)', async () => {
    const createMock = mock.method(stripeClient.checkout.sessions, 'create', async () => ({
      url: 'https://checkout.stripe.com/test-session',
    }));

    try {
      await withEnv({ STRIPE_SECRET_KEY: 'sk_test_fake' }, async () => {
        const subjectId = randomUUID();
        const assignment = await fetch(
          `${baseUrl}/api/experiments/pricing_price/assignment?subjectId=${subjectId}`,
        ).then((r) => r.json());

        const res = await fetch(`${baseUrl}/api/payment/create-checkout-session`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subjectId }),
        });
        assert.equal(res.status, 200);

        const [args] = createMock.mock.calls[0].arguments;
        assert.equal(args.line_items[0].price_data.unit_amount, assignment.config.priceBrlCents);
        assert.equal(args.metadata.experimentName, 'pricing_price');
        assert.equal(args.metadata.experimentSubjectId, subjectId);
        assert.equal(args.metadata.experimentVariant, assignment.variant);
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

  test('logs an experiment conversion when the session carries experiment metadata (Dia 55-56)', async () => {
    const registered = await registerTestUser(baseUrl);
    const experimentUserId = registered.user.id;
    const subjectId = randomUUID();

    const constructMock = mock.method(stripeClient.webhooks, 'constructEvent', () => ({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_experiment',
          metadata: {
            userId: experimentUserId,
            experimentName: 'pricing_price',
            experimentSubjectId: subjectId,
            experimentVariant: 'discount',
          },
        },
      },
    }));

    try {
      await withEnv({ STRIPE_WEBHOOK_SECRET: 'whsec_test' }, async () => {
        const res = await postWebhook({});
        assert.equal(res.status, 200);
      });

      const { rows } = await pool.query(
        `SELECT variant, metadata FROM experiment_events
         WHERE subject_id = $1 AND experiment_name = 'pricing_price' AND event_type = 'conversion'`,
        [subjectId],
      );
      assert.equal(rows.length, 1);
      assert.equal(rows[0].variant, 'discount');
      assert.equal(rows[0].metadata.sessionId, 'cs_test_experiment');
    } finally {
      constructMock.mock.restore();
      await pool.query('DELETE FROM users WHERE id = $1', [experimentUserId]);
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

  test('is idempotent when Stripe redelivers the same event (Dia 50)', async () => {
    const registered = await registerTestUser(baseUrl);
    const redeliveredUserId = registered.user.id;

    const constructMock = mock.method(stripeClient.webhooks, 'constructEvent', () => ({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_redelivered', metadata: { userId: redeliveredUserId } } },
    }));

    try {
      await withEnv({ STRIPE_WEBHOOK_SECRET: 'whsec_test' }, async () => {
        const first = await postWebhook({});
        const second = await postWebhook({});
        assert.equal(first.status, 200);
        assert.equal(second.status, 200);
      });

      const { rows } = await pool.query('SELECT plan FROM users WHERE id = $1', [
        redeliveredUserId,
      ]);
      assert.equal(rows[0].plan, 'pro');
    } finally {
      constructMock.mock.restore();
      await pool.query('DELETE FROM users WHERE id = $1', [redeliveredUserId]);
    }
  });

  test('does not crash on a checkout.session.completed event missing metadata.userId (Dia 50)', async () => {
    const constructMock = mock.method(stripeClient.webhooks, 'constructEvent', () => ({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_no_metadata', metadata: {} } },
    }));

    try {
      await withEnv({ STRIPE_WEBHOOK_SECRET: 'whsec_test' }, async () => {
        const res = await postWebhook({});
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.received, true);
      });
    } finally {
      constructMock.mock.restore();
    }
  });
});

describe('POST /api/payment/refund', () => {
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

  function postRefund(token) {
    return fetch(`${baseUrl}/api/payment/refund`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  test('rejects unauthenticated requests', async () => {
    const res = await postRefund();
    assert.equal(res.status, 401);
  });

  test('returns 503 when Stripe is not configured', async () => {
    assert.ok(!process.env.STRIPE_SECRET_KEY);
    const res = await postRefund(accessToken);
    assert.equal(res.status, 503);
  });

  test('rejects a free-plan user (nothing to refund)', async () => {
    await withEnv({ STRIPE_SECRET_KEY: 'sk_test_fake' }, async () => {
      const res = await postRefund(accessToken);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /no lifetime purchase/);
    });
  });

  test('rejects a pro-plan account with no purchase record (e.g. beta-granted access)', async () => {
    await pool.query(`UPDATE users SET plan = 'pro' WHERE id = $1`, [userId]);

    try {
      await withEnv({ STRIPE_SECRET_KEY: 'sk_test_fake' }, async () => {
        const res = await postRefund(accessToken);
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.match(data.error, /no purchase record/);
      });
    } finally {
      await pool.query(`UPDATE users SET plan = 'free' WHERE id = $1`, [userId]);
    }
  });

  test('rejects a purchase older than the refund window', async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await pool.query(
      `UPDATE users SET plan = 'pro', stripe_payment_intent_id = 'pi_old', purchased_at = $2 WHERE id = $1`,
      [userId, eightDaysAgo],
    );

    try {
      await withEnv({ STRIPE_SECRET_KEY: 'sk_test_fake' }, async () => {
        const res = await postRefund(accessToken);
        assert.equal(res.status, 403);
        const data = await res.json();
        assert.match(data.error, /refund window has expired/);
      });
    } finally {
      await pool.query(
        `UPDATE users SET plan = 'free', stripe_payment_intent_id = NULL, purchased_at = NULL WHERE id = $1`,
        [userId],
      );
    }
  });

  test('refunds a real recent purchase, calling Stripe and downgrading the account', async () => {
    await pool.query(
      `UPDATE users SET plan = 'pro', stripe_payment_intent_id = 'pi_recent', purchased_at = now() WHERE id = $1`,
      [userId],
    );

    const refundMock = mock.method(stripeClient.refunds, 'create', async () => ({ id: 're_1' }));

    try {
      await withEnv({ STRIPE_SECRET_KEY: 'sk_test_fake' }, async () => {
        const res = await postRefund(accessToken);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.refunded, true);
      });

      const [args] = refundMock.mock.calls[0].arguments;
      assert.equal(args.payment_intent, 'pi_recent');

      const { rows } = await pool.query('SELECT plan, refunded_at FROM users WHERE id = $1', [
        userId,
      ]);
      assert.equal(rows[0].plan, 'free');
      assert.ok(rows[0].refunded_at);
    } finally {
      refundMock.mock.restore();
    }
  });

  test('rejects a second refund attempt on the same purchase', async () => {
    await pool.query(
      `UPDATE users SET plan = 'pro', stripe_payment_intent_id = 'pi_again', purchased_at = now(), refunded_at = now() WHERE id = $1`,
      [userId],
    );

    try {
      await withEnv({ STRIPE_SECRET_KEY: 'sk_test_fake' }, async () => {
        const res = await postRefund(accessToken);
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.match(data.error, /already been refunded/);
      });
    } finally {
      await pool.query(
        `UPDATE users SET plan = 'free', stripe_payment_intent_id = NULL, purchased_at = NULL, refunded_at = NULL WHERE id = $1`,
        [userId],
      );
    }
  });
});

describe('Payment sandbox flow (Dia 50)', () => {
  let server;
  let baseUrl;
  let userId;
  let accessToken;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
    const registered = await registerTestUser(baseUrl);
    userId = registered.user.id;
    accessToken = registered.accessToken;
  });

  after(async () => {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await stopTestServer(server);
  });

  // Chains the full purchase flow end to end through our own code - only the
  // actual network calls to Stripe are mocked, which is the only real
  // boundary we can control without a live test-mode account (see
  // PAYMENT_TROUBLESHOOTING.md for what still needs a real sandbox run).
  test('create-checkout-session -> webhook -> GET /api/auth/me reflects the purchase', async () => {
    const createMock = mock.method(stripeClient.checkout.sessions, 'create', async () => ({
      url: 'https://checkout.stripe.com/test-sandbox-session',
    }));
    const constructMock = mock.method(stripeClient.webhooks, 'constructEvent', () => ({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_sandbox', metadata: { userId } } },
    }));

    try {
      await withEnv(
        { STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_WEBHOOK_SECRET: 'whsec_test' },
        async () => {
          const before = await fetch(`${baseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          assert.equal((await before.json()).user.plan, 'free');

          const checkoutRes = await fetch(`${baseUrl}/api/payment/create-checkout-session`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          assert.equal(checkoutRes.status, 200);
          const { url } = await checkoutRes.json();
          assert.equal(url, 'https://checkout.stripe.com/test-sandbox-session');

          const webhookRes = await fetch(`${baseUrl}/api/payment/webhook`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'stripe-signature': 'test-signature',
            },
            body: JSON.stringify({}),
          });
          assert.equal(webhookRes.status, 200);

          const after = await fetch(`${baseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          assert.equal((await after.json()).user.plan, 'pro');
        },
      );
    } finally {
      createMock.mock.restore();
      constructMock.mock.restore();
    }
  });
});

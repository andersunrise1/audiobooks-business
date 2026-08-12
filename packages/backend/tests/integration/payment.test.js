import { after, before, describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { Preference, Payment, PaymentRefund } from 'mercadopago';
import { pool } from '../../src/config/database.js';
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

// Builds a real, correctly-signed webhook request the exact way Mercado
// Pago's own servers would (see paymentService.js's verifyWebhookSignature)
// - exercises the real signature-checking code path instead of mocking it
// away, since that's exactly the part most worth testing for real.
function postWebhook(baseUrl, { dataId, secret, type = 'payment', body }) {
  const ts = String(Date.now());
  const requestId = 'req-test-1';
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac('sha256', secret).update(manifest).digest('hex');

  return fetch(`${baseUrl}/api/payment/webhook?data.id=${dataId}&type=${type}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-signature': `ts=${ts},v1=${v1}`,
      'x-request-id': requestId,
    },
    body: JSON.stringify(body ?? { type, data: { id: dataId } }),
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

  test('returns 503 when Mercado Pago is not configured', async () => {
    assert.ok(!process.env.MERCADOPAGO_ACCESS_TOKEN);

    const res = await fetch(`${baseUrl}/api/payment/create-checkout-session`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    assert.equal(res.status, 503);
    const data = await res.json();
    assert.match(data.error, /MERCADOPAGO_ACCESS_TOKEN/);
  });

  test('creates a preference and returns its checkout URL', async () => {
    const createMock = mock.method(Preference.prototype, 'create', async () => ({
      init_point: 'https://www.mercadopago.com.br/checkout/test-preference',
    }));

    try {
      await withEnv({ MERCADOPAGO_ACCESS_TOKEN: 'TEST-fake' }, async () => {
        const res = await fetch(`${baseUrl}/api/payment/create-checkout-session`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.url, 'https://www.mercadopago.com.br/checkout/test-preference');

        const [args] = createMock.mock.calls[0].arguments;
        assert.equal(args.body.metadata.user_id, userId);
      });
    } finally {
      createMock.mock.restore();
    }
  });

  test('charges the pricing_price variant price for the given subjectId (Dia 55-56)', async () => {
    const createMock = mock.method(Preference.prototype, 'create', async () => ({
      init_point: 'https://www.mercadopago.com.br/checkout/test-preference',
    }));

    try {
      await withEnv({ MERCADOPAGO_ACCESS_TOKEN: 'TEST-fake' }, async () => {
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
        assert.equal(args.body.items[0].unit_price, assignment.config.priceBrlCents / 100);
        assert.equal(args.body.metadata.experiment_name, 'pricing_price');
        assert.equal(args.body.metadata.experiment_subject_id, subjectId);
        assert.equal(args.body.metadata.experiment_variant, assignment.variant);
      });
    } finally {
      createMock.mock.restore();
    }
  });

  test('rejects a user who already has lifetime access', async () => {
    await pool.query(`UPDATE users SET plan = 'pro' WHERE id = $1`, [userId]);

    try {
      await withEnv({ MERCADOPAGO_ACCESS_TOKEN: 'TEST-fake' }, async () => {
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

  test('returns 503 when the webhook secret is not configured', async () => {
    assert.ok(!process.env.MERCADOPAGO_WEBHOOK_SECRET);

    const res = await postWebhook(baseUrl, { dataId: 'pay-1', secret: 'whatever' });
    assert.equal(res.status, 503);
  });

  test('rejects an invalid signature', async () => {
    await withEnv({ MERCADOPAGO_WEBHOOK_SECRET: 'whsecret' }, async () => {
      const res = await postWebhook(baseUrl, { dataId: 'pay-1', secret: 'wrong-secret' });
      assert.equal(res.status, 400);
    });
  });

  test('grants lifetime access on a real approved payment notification', async () => {
    const registered = await registerTestUser(baseUrl);
    userId = registered.user.id;

    const getMock = mock.method(Payment.prototype, 'get', async () => ({
      id: 'pay-approved',
      status: 'approved',
      metadata: { user_id: userId },
    }));

    try {
      await withEnv({ MERCADOPAGO_WEBHOOK_SECRET: 'whsecret' }, async () => {
        const res = await postWebhook(baseUrl, { dataId: 'pay-approved', secret: 'whsecret' });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.received, true);
      });

      const { rows } = await pool.query('SELECT plan FROM users WHERE id = $1', [userId]);
      assert.equal(rows[0].plan, 'pro');
    } finally {
      getMock.mock.restore();
    }
  });

  test('does not grant access for a pending (not yet approved) payment', async () => {
    const registered = await registerTestUser(baseUrl);
    const pendingUserId = registered.user.id;

    const getMock = mock.method(Payment.prototype, 'get', async () => ({
      id: 'pay-pending',
      status: 'pending',
      metadata: { user_id: pendingUserId },
    }));

    try {
      await withEnv({ MERCADOPAGO_WEBHOOK_SECRET: 'whsecret' }, async () => {
        const res = await postWebhook(baseUrl, { dataId: 'pay-pending', secret: 'whsecret' });
        assert.equal(res.status, 200);
      });

      const { rows } = await pool.query('SELECT plan FROM users WHERE id = $1', [pendingUserId]);
      assert.equal(rows[0].plan, 'free');
    } finally {
      getMock.mock.restore();
      await pool.query('DELETE FROM users WHERE id = $1', [pendingUserId]);
    }
  });

  test('logs an experiment conversion when the payment carries experiment metadata (Dia 55-56)', async () => {
    const registered = await registerTestUser(baseUrl);
    const experimentUserId = registered.user.id;
    const subjectId = randomUUID();

    const getMock = mock.method(Payment.prototype, 'get', async () => ({
      id: 'pay-experiment',
      status: 'approved',
      metadata: {
        user_id: experimentUserId,
        experiment_name: 'pricing_price',
        experiment_subject_id: subjectId,
        experiment_variant: 'discount',
      },
    }));

    try {
      await withEnv({ MERCADOPAGO_WEBHOOK_SECRET: 'whsecret' }, async () => {
        const res = await postWebhook(baseUrl, { dataId: 'pay-experiment', secret: 'whsecret' });
        assert.equal(res.status, 200);
      });

      const { rows } = await pool.query(
        `SELECT variant, metadata FROM experiment_events
         WHERE subject_id = $1 AND experiment_name = 'pricing_price' AND event_type = 'conversion'`,
        [subjectId],
      );
      assert.equal(rows.length, 1);
      assert.equal(rows[0].variant, 'discount');
      assert.equal(rows[0].metadata.paymentId, 'pay-experiment');
    } finally {
      getMock.mock.restore();
      await pool.query('DELETE FROM users WHERE id = $1', [experimentUserId]);
    }
  });

  test('ignores unrelated notification types without touching the database', async () => {
    const registered = await registerTestUser(baseUrl);
    const otherUserId = registered.user.id;

    try {
      await withEnv({ MERCADOPAGO_WEBHOOK_SECRET: 'whsecret' }, async () => {
        const res = await postWebhook(baseUrl, {
          dataId: 'merchant-order-1',
          secret: 'whsecret',
          type: 'merchant_order',
        });
        assert.equal(res.status, 200);
      });

      const { rows } = await pool.query('SELECT plan FROM users WHERE id = $1', [otherUserId]);
      assert.equal(rows[0].plan, 'free');
    } finally {
      await pool.query('DELETE FROM users WHERE id = $1', [otherUserId]);
    }
  });

  test('is idempotent when Mercado Pago redelivers the same notification (Dia 50)', async () => {
    const registered = await registerTestUser(baseUrl);
    const redeliveredUserId = registered.user.id;

    const getMock = mock.method(Payment.prototype, 'get', async () => ({
      id: 'pay-redelivered',
      status: 'approved',
      metadata: { user_id: redeliveredUserId },
    }));

    try {
      await withEnv({ MERCADOPAGO_WEBHOOK_SECRET: 'whsecret' }, async () => {
        const first = await postWebhook(baseUrl, { dataId: 'pay-redelivered', secret: 'whsecret' });
        const second = await postWebhook(baseUrl, {
          dataId: 'pay-redelivered',
          secret: 'whsecret',
        });
        assert.equal(first.status, 200);
        assert.equal(second.status, 200);
      });

      const { rows } = await pool.query('SELECT plan FROM users WHERE id = $1', [
        redeliveredUserId,
      ]);
      assert.equal(rows[0].plan, 'pro');
    } finally {
      getMock.mock.restore();
      await pool.query('DELETE FROM users WHERE id = $1', [redeliveredUserId]);
    }
  });

  test('does not crash on an approved payment missing metadata.user_id (Dia 50)', async () => {
    const getMock = mock.method(Payment.prototype, 'get', async () => ({
      id: 'pay-no-metadata',
      status: 'approved',
      metadata: {},
    }));

    try {
      await withEnv({ MERCADOPAGO_WEBHOOK_SECRET: 'whsecret' }, async () => {
        const res = await postWebhook(baseUrl, { dataId: 'pay-no-metadata', secret: 'whsecret' });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.received, true);
      });
    } finally {
      getMock.mock.restore();
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

  test('returns 503 when Mercado Pago is not configured', async () => {
    assert.ok(!process.env.MERCADOPAGO_ACCESS_TOKEN);
    const res = await postRefund(accessToken);
    assert.equal(res.status, 503);
  });

  test('rejects a free-plan user (nothing to refund)', async () => {
    await withEnv({ MERCADOPAGO_ACCESS_TOKEN: 'TEST-fake' }, async () => {
      const res = await postRefund(accessToken);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /no lifetime purchase/);
    });
  });

  test('rejects a pro-plan account with no purchase record (e.g. beta-granted access)', async () => {
    await pool.query(`UPDATE users SET plan = 'pro' WHERE id = $1`, [userId]);

    try {
      await withEnv({ MERCADOPAGO_ACCESS_TOKEN: 'TEST-fake' }, async () => {
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
      `UPDATE users SET plan = 'pro', mp_payment_id = 'pay-old', purchased_at = $2 WHERE id = $1`,
      [userId, eightDaysAgo],
    );

    try {
      await withEnv({ MERCADOPAGO_ACCESS_TOKEN: 'TEST-fake' }, async () => {
        const res = await postRefund(accessToken);
        assert.equal(res.status, 403);
        const data = await res.json();
        assert.match(data.error, /refund window has expired/);
      });
    } finally {
      await pool.query(
        `UPDATE users SET plan = 'free', mp_payment_id = NULL, purchased_at = NULL WHERE id = $1`,
        [userId],
      );
    }
  });

  test('refunds a real recent purchase, calling Mercado Pago and downgrading the account', async () => {
    await pool.query(
      `UPDATE users SET plan = 'pro', mp_payment_id = 'pay-recent', purchased_at = now() WHERE id = $1`,
      [userId],
    );

    const refundMock = mock.method(PaymentRefund.prototype, 'total', async () => ({ id: 1 }));

    try {
      await withEnv({ MERCADOPAGO_ACCESS_TOKEN: 'TEST-fake' }, async () => {
        const res = await postRefund(accessToken);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.refunded, true);
      });

      const [args] = refundMock.mock.calls[0].arguments;
      assert.equal(args.payment_id, 'pay-recent');

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
      `UPDATE users SET plan = 'pro', mp_payment_id = 'pay-again', purchased_at = now(), refunded_at = now() WHERE id = $1`,
      [userId],
    );

    try {
      await withEnv({ MERCADOPAGO_ACCESS_TOKEN: 'TEST-fake' }, async () => {
        const res = await postRefund(accessToken);
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.match(data.error, /already been refunded/);
      });
    } finally {
      await pool.query(
        `UPDATE users SET plan = 'free', mp_payment_id = NULL, purchased_at = NULL, refunded_at = NULL WHERE id = $1`,
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
  // actual network calls to Mercado Pago are mocked, which is the only real
  // boundary we can control without a live sandbox account (see
  // PAYMENT_TROUBLESHOOTING.md for what still needs a real sandbox run).
  test('create-checkout-session -> webhook -> GET /api/auth/me reflects the purchase', async () => {
    const createMock = mock.method(Preference.prototype, 'create', async () => ({
      init_point: 'https://www.mercadopago.com.br/checkout/test-sandbox-preference',
    }));
    const getMock = mock.method(Payment.prototype, 'get', async () => ({
      id: 'pay-sandbox',
      status: 'approved',
      metadata: { user_id: userId },
    }));

    try {
      await withEnv(
        { MERCADOPAGO_ACCESS_TOKEN: 'TEST-fake', MERCADOPAGO_WEBHOOK_SECRET: 'whsecret' },
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
          assert.equal(url, 'https://www.mercadopago.com.br/checkout/test-sandbox-preference');

          const webhookRes = await postWebhook(baseUrl, {
            dataId: 'pay-sandbox',
            secret: 'whsecret',
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
      getMock.mock.restore();
    }
  });
});

import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { Preference, Payment, PaymentRefund } from 'mercadopago';
import {
  isMercadoPagoConfigured,
  isWebhookConfigured,
  createLifetimeCheckoutSession,
  verifyWebhookSignature,
  getPayment,
  grantLifetimeAccess,
  refundLifetimePurchase,
  isWithinRefundWindow,
  REFUND_WINDOW_DAYS,
  LIFETIME_PRICE_BRL_CENTS,
  LIFETIME_PRODUCT_NAME,
} from '../../src/services/paymentService.js';
import { pool } from '../../src/config/database.js';

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

function fakeSignatureHeaders({ dataId, secret, ts = String(Date.now()) }) {
  const requestId = 'req-123';
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return {
    headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId },
    query: { 'data.id': dataId },
  };
}

describe('paymentService.isMercadoPagoConfigured', () => {
  test('is false when MERCADOPAGO_ACCESS_TOKEN is unset', async () => {
    await withEnv({ MERCADOPAGO_ACCESS_TOKEN: undefined }, () => {
      assert.equal(isMercadoPagoConfigured(), false);
    });
  });

  test('is true when MERCADOPAGO_ACCESS_TOKEN is set', async () => {
    await withEnv({ MERCADOPAGO_ACCESS_TOKEN: 'TEST-123' }, () => {
      assert.equal(isMercadoPagoConfigured(), true);
    });
  });
});

describe('paymentService.isWebhookConfigured', () => {
  test('is false when MERCADOPAGO_WEBHOOK_SECRET is unset', async () => {
    await withEnv({ MERCADOPAGO_WEBHOOK_SECRET: undefined }, () => {
      assert.equal(isWebhookConfigured(), false);
    });
  });

  test('is true when MERCADOPAGO_WEBHOOK_SECRET is set', async () => {
    await withEnv({ MERCADOPAGO_WEBHOOK_SECRET: 'secret-123' }, () => {
      assert.equal(isWebhookConfigured(), true);
    });
  });
});

describe('paymentService.createLifetimeCheckoutSession', () => {
  test('creates a one-time preference with the right price and metadata', async () => {
    const createMock = mock.method(Preference.prototype, 'create', async () => ({
      init_point: 'https://www.mercadopago.com.br/checkout/test-preference',
    }));

    try {
      await withEnv({ FRONTEND_URL: 'https://techspeaking.dev' }, async () => {
        const user = { id: 'user-1', email: 'a@b.com' };
        const result = await createLifetimeCheckoutSession(user);

        assert.equal(result.url, 'https://www.mercadopago.com.br/checkout/test-preference');

        const [args] = createMock.mock.calls[0].arguments;
        assert.equal(args.body.payer.email, 'a@b.com');
        assert.equal(args.body.metadata.user_id, 'user-1');
        assert.equal(args.body.items[0].unit_price, LIFETIME_PRICE_BRL_CENTS / 100);
        assert.equal(args.body.items[0].currency_id, 'BRL');
        assert.equal(args.body.items[0].title, LIFETIME_PRODUCT_NAME);
        assert.equal(args.body.items[0].quantity, 1);
        assert.equal(args.body.auto_return, 'approved');
      });
    } finally {
      createMock.mock.restore();
    }
  });

  // Real bug caught by testing against the live Mercado Pago API (not
  // assumed from docs): auto_return fails preference creation outright
  // unless back_urls.success is a real https:// URL - a plain
  // http://localhost back_url is otherwise accepted on its own. Confirmed
  // directly against the sandbox API before this fix existed (a genuine
  // 400 "auto_return invalid. back_url.success must be defined").
  test('omits auto_return when FRONTEND_URL is not https (e.g. local dev)', async () => {
    const createMock = mock.method(Preference.prototype, 'create', async () => ({
      init_point: 'https://www.mercadopago.com.br/checkout/test-preference',
    }));

    try {
      await withEnv({ FRONTEND_URL: 'http://localhost:5173' }, async () => {
        const user = { id: 'user-1', email: 'a@b.com' };
        await createLifetimeCheckoutSession(user);

        const [args] = createMock.mock.calls[0].arguments;
        assert.equal('auto_return' in args.body, false);
        assert.equal(args.body.back_urls.success, 'http://localhost:5173/payment/success');
      });
    } finally {
      createMock.mock.restore();
    }
  });

  test('falls back to sandbox_init_point when init_point is absent', async () => {
    const createMock = mock.method(Preference.prototype, 'create', async () => ({
      sandbox_init_point: 'https://sandbox.mercadopago.com.br/checkout/test-preference',
    }));

    try {
      const result = await createLifetimeCheckoutSession({ id: 'user-1', email: 'a@b.com' });
      assert.equal(result.url, 'https://sandbox.mercadopago.com.br/checkout/test-preference');
    } finally {
      createMock.mock.restore();
    }
  });

  // Regression: FRONTEND_URL became a comma-separated list on Dia 75 for
  // multi-origin CORS support - this must build back_urls from only the
  // first entry, not the raw list (same class of bug the Stripe version had).
  test('uses only the first FRONTEND_URL entry when it is a comma-separated list', async () => {
    const createMock = mock.method(Preference.prototype, 'create', async () => ({
      init_point: 'https://www.mercadopago.com.br/checkout/test-preference',
    }));

    try {
      await withEnv(
        { FRONTEND_URL: 'https://techspeaking.dev,https://www.techspeaking.dev' },
        async () => {
          const user = { id: 'user-1', email: 'a@b.com' };
          await createLifetimeCheckoutSession(user);

          const [args] = createMock.mock.calls[0].arguments;
          assert.equal(args.body.back_urls.success, 'https://techspeaking.dev/payment/success');
          assert.equal(args.body.back_urls.failure, 'https://techspeaking.dev/payment/cancel');
          assert.doesNotMatch(args.body.back_urls.success, /,/);
          assert.doesNotMatch(args.body.back_urls.failure, /,/);
        },
      );
    } finally {
      createMock.mock.restore();
    }
  });

  test('stashes experiment identifiers snake_cased for the webhook to read back', async () => {
    const createMock = mock.method(Preference.prototype, 'create', async () => ({
      init_point: 'https://www.mercadopago.com.br/checkout/test-preference',
    }));

    try {
      const user = { id: 'user-1', email: 'a@b.com' };
      await createLifetimeCheckoutSession(user, {
        experiment: { name: 'pricing_price', subjectId: 'subj-1', variant: 'discount' },
      });

      const [args] = createMock.mock.calls[0].arguments;
      assert.equal(args.body.metadata.experiment_name, 'pricing_price');
      assert.equal(args.body.metadata.experiment_subject_id, 'subj-1');
      assert.equal(args.body.metadata.experiment_variant, 'discount');
    } finally {
      createMock.mock.restore();
    }
  });
});

describe('paymentService.verifyWebhookSignature', () => {
  test('accepts a signature computed with the configured secret', async () => {
    await withEnv({ MERCADOPAGO_WEBHOOK_SECRET: 'whsecret' }, () => {
      const { headers, query } = fakeSignatureHeaders({ dataId: 'PAY123', secret: 'whsecret' });
      assert.equal(verifyWebhookSignature({ headers, query }), true);
    });
  });

  test('rejects a signature computed with the wrong secret', async () => {
    await withEnv({ MERCADOPAGO_WEBHOOK_SECRET: 'whsecret' }, () => {
      const { headers, query } = fakeSignatureHeaders({ dataId: 'PAY123', secret: 'wrong' });
      assert.equal(verifyWebhookSignature({ headers, query }), false);
    });
  });

  test('is false when the x-signature header is missing', async () => {
    await withEnv({ MERCADOPAGO_WEBHOOK_SECRET: 'whsecret' }, () => {
      assert.equal(
        verifyWebhookSignature({ headers: { 'x-request-id': 'req-1' }, query: { 'data.id': '1' } }),
        false,
      );
    });
  });

  test('is false when data.id is missing from the query string', async () => {
    await withEnv({ MERCADOPAGO_WEBHOOK_SECRET: 'whsecret' }, () => {
      const { headers } = fakeSignatureHeaders({ dataId: 'PAY123', secret: 'whsecret' });
      assert.equal(verifyWebhookSignature({ headers, query: {} }), false);
    });
  });
});

describe('paymentService.getPayment', () => {
  test('delegates to the Mercado Pago SDK', async () => {
    const getMock = mock.method(Payment.prototype, 'get', async () => ({
      status: 'approved',
    }));

    try {
      const payment = await getPayment('pay-123');
      assert.equal(payment.status, 'approved');
      const [args] = getMock.mock.calls[0].arguments;
      assert.equal(args.id, 'pay-123');
    } finally {
      getMock.mock.restore();
    }
  });
});

describe('paymentService.grantLifetimeAccess', () => {
  test('updates the user plan to pro and records the payment id', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [] }));

    try {
      await grantLifetimeAccess('user-1', 'pay-123');
      const [sql, params] = queryMock.mock.calls[0].arguments;
      assert.match(sql, /UPDATE users/);
      assert.match(sql, /plan = 'pro'/);
      assert.deepEqual(params, ['user-1', 'pay-123']);
    } finally {
      queryMock.mock.restore();
    }
  });

  test('defaults the payment id to null when not given', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [] }));

    try {
      await grantLifetimeAccess('user-1');
      const [, params] = queryMock.mock.calls[0].arguments;
      assert.deepEqual(params, ['user-1', null]);
    } finally {
      queryMock.mock.restore();
    }
  });
});

describe('paymentService.isWithinRefundWindow', () => {
  test('is false when there is no purchase date', () => {
    assert.equal(isWithinRefundWindow(null), false);
  });

  test(`is true within ${REFUND_WINDOW_DAYS} days of the purchase`, () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    assert.equal(isWithinRefundWindow(oneDayAgo), true);
  });

  test(`is false after ${REFUND_WINDOW_DAYS} days have passed`, () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(isWithinRefundWindow(eightDaysAgo), false);
  });
});

describe('paymentService.refundLifetimePurchase', () => {
  test('calls the real Mercado Pago refund API and downgrades the account', async () => {
    const refundMock = mock.method(PaymentRefund.prototype, 'total', async () => ({
      id: 1,
    }));
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [] }));

    try {
      await refundLifetimePurchase({ id: 'user-1', mp_payment_id: 'pay-123' });

      const [refundArgs] = refundMock.mock.calls[0].arguments;
      assert.equal(refundArgs.payment_id, 'pay-123');

      const [sql, params] = queryMock.mock.calls[0].arguments;
      assert.match(sql, /plan = 'free'/);
      assert.match(sql, /refunded_at = now\(\)/);
      assert.deepEqual(params, ['user-1']);
    } finally {
      refundMock.mock.restore();
      queryMock.mock.restore();
    }
  });
});

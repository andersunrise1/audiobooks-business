import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  isStripeConfigured,
  isWebhookConfigured,
  createLifetimeCheckoutSession,
  constructWebhookEvent,
  grantLifetimeAccess,
  refundLifetimePurchase,
  isWithinRefundWindow,
  REFUND_WINDOW_DAYS,
  LIFETIME_PRICE_BRL_CENTS,
  LIFETIME_PRODUCT_NAME,
} from '../../src/services/paymentService.js';
import { stripeClient } from '../../src/config/stripe.js';
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

describe('paymentService.isStripeConfigured', () => {
  test('is false when STRIPE_SECRET_KEY is unset', async () => {
    await withEnv({ STRIPE_SECRET_KEY: undefined }, () => {
      assert.equal(isStripeConfigured(), false);
    });
  });

  test('is true when STRIPE_SECRET_KEY is set', async () => {
    await withEnv({ STRIPE_SECRET_KEY: 'sk_test_123' }, () => {
      assert.equal(isStripeConfigured(), true);
    });
  });
});

describe('paymentService.isWebhookConfigured', () => {
  test('is false when STRIPE_WEBHOOK_SECRET is unset', async () => {
    await withEnv({ STRIPE_WEBHOOK_SECRET: undefined }, () => {
      assert.equal(isWebhookConfigured(), false);
    });
  });

  test('is true when STRIPE_WEBHOOK_SECRET is set', async () => {
    await withEnv({ STRIPE_WEBHOOK_SECRET: 'whsec_123' }, () => {
      assert.equal(isWebhookConfigured(), true);
    });
  });
});

describe('paymentService.createLifetimeCheckoutSession', () => {
  test('creates a one-time payment session with the right price and metadata', async () => {
    const createMock = mock.method(stripeClient.checkout.sessions, 'create', async () => ({
      url: 'https://checkout.stripe.com/test-session',
    }));

    try {
      const user = { id: 'user-1', email: 'a@b.com' };
      const result = await createLifetimeCheckoutSession(user);

      assert.equal(result.url, 'https://checkout.stripe.com/test-session');

      const [args] = createMock.mock.calls[0].arguments;
      assert.equal(args.mode, 'payment');
      assert.equal(args.customer_email, 'a@b.com');
      assert.equal(args.metadata.userId, 'user-1');
      assert.equal(args.line_items[0].price_data.unit_amount, LIFETIME_PRICE_BRL_CENTS);
      assert.equal(args.line_items[0].price_data.currency, 'brl');
      assert.equal(args.line_items[0].price_data.product_data.name, LIFETIME_PRODUCT_NAME);
      assert.equal(args.line_items[0].quantity, 1);
    } finally {
      createMock.mock.restore();
    }
  });

  // Regression: FRONTEND_URL became a comma-separated list on Dia 75 for
  // multi-origin CORS support, but this function still built success_url/
  // cancel_url from the raw env var - producing a malformed redirect
  // target like "https://a.com,https://b.com/payment/success" that the
  // browser can't load ("site can't be reached"), caught by a real test
  // purchase against the live app.
  test('uses only the first FRONTEND_URL entry when it is a comma-separated list', async () => {
    const createMock = mock.method(stripeClient.checkout.sessions, 'create', async () => ({
      url: 'https://checkout.stripe.com/test-session',
    }));

    try {
      await withEnv(
        { FRONTEND_URL: 'https://techspeaking.dev,https://www.techspeaking.dev' },
        async () => {
          const user = { id: 'user-1', email: 'a@b.com' };
          await createLifetimeCheckoutSession(user);

          const [args] = createMock.mock.calls[0].arguments;
          assert.equal(
            args.success_url,
            'https://techspeaking.dev/payment/success?session_id={CHECKOUT_SESSION_ID}',
          );
          assert.equal(args.cancel_url, 'https://techspeaking.dev/payment/cancel');
          assert.doesNotMatch(args.success_url, /,/);
          assert.doesNotMatch(args.cancel_url, /,/);
        },
      );
    } finally {
      createMock.mock.restore();
    }
  });
});

describe('paymentService.constructWebhookEvent', () => {
  test('delegates to the Stripe SDK with the configured webhook secret', async () => {
    const constructMock = mock.method(stripeClient.webhooks, 'constructEvent', () => ({
      type: 'checkout.session.completed',
    }));

    await withEnv({ STRIPE_WEBHOOK_SECRET: 'whsec_test' }, () => {
      const event = constructWebhookEvent('raw-body', 'test-signature');
      assert.equal(event.type, 'checkout.session.completed');

      const args = constructMock.mock.calls[0].arguments;
      assert.deepEqual(args, ['raw-body', 'test-signature', 'whsec_test']);
    });

    constructMock.mock.restore();
  });

  test('throws when the signature is invalid', () => {
    const constructMock = mock.method(stripeClient.webhooks, 'constructEvent', () => {
      throw new Error('invalid signature');
    });

    try {
      assert.throws(() => constructWebhookEvent('raw-body', 'bad-signature'));
    } finally {
      constructMock.mock.restore();
    }
  });
});

describe('paymentService.grantLifetimeAccess', () => {
  test('updates the user plan to pro and records the payment intent', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [] }));

    try {
      await grantLifetimeAccess('user-1', 'pi_123');
      const [sql, params] = queryMock.mock.calls[0].arguments;
      assert.match(sql, /UPDATE users/);
      assert.match(sql, /plan = 'pro'/);
      assert.deepEqual(params, ['user-1', 'pi_123']);
    } finally {
      queryMock.mock.restore();
    }
  });

  test('defaults the payment intent to null when not given', async () => {
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
  test('calls the real Stripe refund API and downgrades the account', async () => {
    const refundMock = mock.method(stripeClient.refunds, 'create', async () => ({
      id: 're_123',
    }));
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [] }));

    try {
      await refundLifetimePurchase({ id: 'user-1', stripe_payment_intent_id: 'pi_123' });

      const [refundArgs] = refundMock.mock.calls[0].arguments;
      assert.equal(refundArgs.payment_intent, 'pi_123');

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

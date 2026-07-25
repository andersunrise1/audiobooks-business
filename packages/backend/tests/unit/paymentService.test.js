import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  isStripeConfigured,
  isWebhookConfigured,
  createLifetimeCheckoutSession,
  constructWebhookEvent,
  grantLifetimeAccess,
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
  test('updates the user plan to pro', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [] }));

    try {
      await grantLifetimeAccess('user-1');
      const [sql, params] = queryMock.mock.calls[0].arguments;
      assert.match(sql, /UPDATE users SET plan = 'pro'/);
      assert.deepEqual(params, ['user-1']);
    } finally {
      queryMock.mock.restore();
    }
  });
});

import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { google } from 'googleapis';
import {
  isGooglePlayConfigured,
  getProductPurchase,
  acknowledgeProductPurchase,
  grantLifetimeAccessFromGooglePlay,
  LIFETIME_PRODUCT_ID,
} from '../../src/services/googlePlayService.js';
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

// Content doesn't matter - isGooglePlayConfigured only checks the path
// exists, and every real API call in these tests is mocked below, so this
// never gets parsed as a real service account key.
const FAKE_KEY_PATH = new URL('../../package.json', import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  '$1',
);

describe('isGooglePlayConfigured', () => {
  test('false when either env var is missing', async () => {
    await withEnv(
      { GOOGLE_PLAY_PACKAGE_NAME: undefined, GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH: undefined },
      () => {
        assert.equal(isGooglePlayConfigured(), false);
      },
    );
    await withEnv(
      {
        GOOGLE_PLAY_PACKAGE_NAME: 'com.techspeaking.app',
        GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH: undefined,
      },
      () => {
        assert.equal(isGooglePlayConfigured(), false);
      },
    );
  });

  test('false when the key path is set but the file does not exist', async () => {
    await withEnv(
      {
        GOOGLE_PLAY_PACKAGE_NAME: 'com.techspeaking.app',
        GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH: '/does/not/exist.json',
      },
      () => {
        assert.equal(isGooglePlayConfigured(), false);
      },
    );
  });

  test('true when both are set and the key file exists', async () => {
    await withEnv(
      {
        GOOGLE_PLAY_PACKAGE_NAME: 'com.techspeaking.app',
        GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH: FAKE_KEY_PATH,
      },
      () => {
        assert.equal(isGooglePlayConfigured(), true);
      },
    );
  });
});

describe('getProductPurchase / acknowledgeProductPurchase', () => {
  test('getProductPurchase calls the Android Publisher API with the right ids and returns its data', async () => {
    const getMock = mock.fn(async ({ packageName, productId, token }) => ({
      data: { purchaseState: 0, acknowledgementState: 0, packageName, productId, token },
    }));
    const androidpublisherMock = mock.method(google, 'androidpublisher', () => ({
      purchases: { products: { get: getMock, acknowledge: mock.fn() } },
    }));

    try {
      const result = await withEnv(
        {
          GOOGLE_PLAY_PACKAGE_NAME: 'com.techspeaking.app',
          GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH: FAKE_KEY_PATH,
        },
        () => getProductPurchase('tok-123'),
      );

      assert.equal(result.purchaseState, 0);
      assert.equal(getMock.mock.calls.length, 1);
      assert.deepEqual(getMock.mock.calls[0].arguments[0], {
        packageName: 'com.techspeaking.app',
        productId: LIFETIME_PRODUCT_ID,
        token: 'tok-123',
      });
    } finally {
      androidpublisherMock.mock.restore();
    }
  });

  test('acknowledgeProductPurchase calls the Android Publisher API with the right ids', async () => {
    const acknowledgeMock = mock.fn(async () => ({}));
    const androidpublisherMock = mock.method(google, 'androidpublisher', () => ({
      purchases: { products: { get: mock.fn(), acknowledge: acknowledgeMock } },
    }));

    try {
      await withEnv(
        {
          GOOGLE_PLAY_PACKAGE_NAME: 'com.techspeaking.app',
          GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH: FAKE_KEY_PATH,
        },
        () => acknowledgeProductPurchase('tok-456'),
      );

      assert.equal(acknowledgeMock.mock.calls.length, 1);
      assert.deepEqual(acknowledgeMock.mock.calls[0].arguments[0], {
        packageName: 'com.techspeaking.app',
        productId: LIFETIME_PRODUCT_ID,
        token: 'tok-456',
        requestBody: {},
      });
    } finally {
      androidpublisherMock.mock.restore();
    }
  });
});

describe('grantLifetimeAccessFromGooglePlay', () => {
  test('sets plan to pro and stores the purchase token', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [] }));
    try {
      await grantLifetimeAccessFromGooglePlay('user-1', 'tok-789');
      assert.equal(queryMock.mock.calls.length, 1);
      const [sql, params] = queryMock.mock.calls[0].arguments;
      assert.match(sql, /SET plan = 'pro'/);
      assert.match(sql, /google_play_purchase_token = \$2/);
      assert.deepEqual(params, ['user-1', 'tok-789']);
    } finally {
      queryMock.mock.restore();
    }
  });
});

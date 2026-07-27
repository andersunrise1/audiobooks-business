import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  getVariantName,
  getVariantConfig,
  logExposure,
  logConversion,
  getExperimentResults,
} from '../../src/services/experimentService.js';
import { pool } from '../../src/config/database.js';

describe('experimentService.getVariantName', () => {
  test('is deterministic for the same experiment + subject', () => {
    const first = getVariantName('pricing_price', 'visitor-123');
    const second = getVariantName('pricing_price', 'visitor-123');
    assert.equal(first, second);
  });

  test('returns null for an unknown experiment', () => {
    assert.equal(getVariantName('not_a_real_experiment', 'visitor-123'), null);
  });

  test('returns null when subjectId is missing', () => {
    assert.equal(getVariantName('pricing_price', undefined), null);
  });

  test('distributes across both configured variants over many subjects', () => {
    const seen = new Set();
    for (let i = 0; i < 200; i += 1) {
      seen.add(getVariantName('pricing_price', `visitor-${i}`));
    }
    assert.deepEqual([...seen].sort(), ['control', 'discount']);
  });
});

describe('experimentService.getVariantConfig', () => {
  test('returns the config for a known experiment/variant', () => {
    const config = getVariantConfig('pricing_price', 'control');
    assert.equal(config.priceBrlCents, 5700);
  });

  test('returns null for an unknown variant', () => {
    assert.equal(getVariantConfig('pricing_price', 'not-a-variant'), null);
  });
});

describe('experimentService.logExposure / logConversion', () => {
  test('logExposure inserts an exposure row with ON CONFLICT DO NOTHING', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [] }));

    try {
      await logExposure('pricing_price', 'visitor-1', 'control');
      const [sql, params] = queryMock.mock.calls[0].arguments;
      assert.match(sql, /ON CONFLICT/);
      assert.deepEqual(params, ['visitor-1', 'pricing_price', 'control']);
    } finally {
      queryMock.mock.restore();
    }
  });

  test('logConversion inserts a conversion row with metadata', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [] }));

    try {
      await logConversion('pricing_price', 'visitor-1', 'control', { sessionId: 'cs_1' });
      const [, params] = queryMock.mock.calls[0].arguments;
      assert.deepEqual(params, [
        'visitor-1',
        'pricing_price',
        'control',
        JSON.stringify({ sessionId: 'cs_1' }),
      ]);
    } finally {
      queryMock.mock.restore();
    }
  });
});

describe('experimentService.getExperimentResults', () => {
  test('maps rows to camelCase and computes a conversion rate per variant', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({
      rows: [
        { variant: 'control', exposures: 100, conversions: 5 },
        { variant: 'discount', exposures: 100, conversions: 12 },
      ],
    }));

    try {
      const result = await getExperimentResults('pricing_price');
      assert.deepEqual(result, [
        { variant: 'control', exposures: 100, conversions: 5, conversionRate: 0.05 },
        { variant: 'discount', exposures: 100, conversions: 12, conversionRate: 0.12 },
      ]);
    } finally {
      queryMock.mock.restore();
    }
  });

  test('returns a null conversion rate when a variant has no exposures yet', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({
      rows: [{ variant: 'control', exposures: 0, conversions: 0 }],
    }));

    try {
      const result = await getExperimentResults('pricing_price');
      assert.equal(result[0].conversionRate, null);
    } finally {
      queryMock.mock.restore();
    }
  });
});

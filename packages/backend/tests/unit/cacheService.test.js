import { describe, test, mock, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getCache, setCache, deleteCache, hashKey } from '../../src/services/cacheService.js';
import { redisClient } from '../../src/config/redis.js';

describe('cacheService.hashKey', () => {
  test('is stable for the same input and different for different input', () => {
    assert.equal(hashKey('hello'), hashKey('hello'));
    assert.notEqual(hashKey('hello'), hashKey('world'));
  });
});

// These run before any successful-connect test below, because connectRedis()
// memoizes a resolved connection promise at module scope once it succeeds -
// once that happens, later "unreachable" mocks would never actually be hit.
describe('cacheService when Redis is unreachable', () => {
  test('getCache returns null instead of throwing', async () => {
    const connectMock = mock.method(redisClient, 'connect', async () => {
      throw new Error('ECONNREFUSED');
    });

    try {
      const result = await getCache('some-key');
      assert.equal(result, null);
    } finally {
      connectMock.mock.restore();
    }
  });

  test('setCache does not throw', async () => {
    const connectMock = mock.method(redisClient, 'connect', async () => {
      throw new Error('ECONNREFUSED');
    });

    try {
      await assert.doesNotReject(setCache('some-key', { foo: 'bar' }));
    } finally {
      connectMock.mock.restore();
    }
  });

  test('deleteCache does not throw', async () => {
    const connectMock = mock.method(redisClient, 'connect', async () => {
      throw new Error('ECONNREFUSED');
    });

    try {
      await assert.doesNotReject(deleteCache('some-key'));
    } finally {
      connectMock.mock.restore();
    }
  });
});

describe('cacheService when Redis is reachable', () => {
  let connectMock;

  before(() => {
    connectMock = mock.method(redisClient, 'connect', async () => {});
  });

  after(() => {
    connectMock.mock.restore();
  });

  test('getCache returns null on a cache miss', async () => {
    const getMock = mock.method(redisClient, 'get', async () => null);

    try {
      const result = await getCache('some-key');
      assert.equal(result, null);
    } finally {
      getMock.mock.restore();
    }
  });

  test('getCache parses and returns a cached JSON value', async () => {
    const getMock = mock.method(redisClient, 'get', async () =>
      JSON.stringify({ explanation: 'cached answer' }),
    );

    try {
      const result = await getCache('some-key');
      assert.deepEqual(result, { explanation: 'cached answer' });
    } finally {
      getMock.mock.restore();
    }
  });

  test('setCache stores a JSON-stringified value with a TTL', async () => {
    const setMock = mock.method(redisClient, 'set', async () => 'OK');

    try {
      await setCache('some-key', { explanation: 'answer' }, 60);

      assert.equal(setMock.mock.calls.length, 1);
      const [key, value, options] = setMock.mock.calls[0].arguments;
      assert.equal(key, 'some-key');
      assert.equal(value, JSON.stringify({ explanation: 'answer' }));
      assert.deepEqual(options, { EX: 60 });
    } finally {
      setMock.mock.restore();
    }
  });

  test('deleteCache calls redis DEL with the key', async () => {
    const delMock = mock.method(redisClient, 'del', async () => 1);

    try {
      await deleteCache('some-key');
      assert.equal(delMock.mock.calls.length, 1);
      assert.equal(delMock.mock.calls[0].arguments[0], 'some-key');
    } finally {
      delMock.mock.restore();
    }
  });
});

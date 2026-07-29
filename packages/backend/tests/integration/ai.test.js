import { after, before, describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/config/database.js';
import {
  buildChatContext,
  explainCacheKey,
  remedialCacheKey,
  client,
} from '../../src/services/aiService.js';
import { setCache } from '../../src/services/cacheService.js';
import { closeRedis } from '../../src/config/redis.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

// This file is the only one that opens a real Redis connection (via
// setCache/getCache against the real client, not a mock). A held-open
// connection keeps `node --test` from exiting after tests finish, so close
// it once, after every describe block in this file has run.
after(async () => {
  await closeRedis();
});

// Each describe block below registers one (free-plan) test user and makes
// several real requests to /api/ai/* as that user. Dia 49 made the daily AI
// limit plan-aware and dropped the free-plan default to 1/day (rateLimit.js
// dedicated test file covers the limiting behavior itself) - without this
// override, every test past the first real call in a describe block would
// 429 instead of exercising the endpoint behavior this file actually tests.
let originalFreeLimit;
before(() => {
  originalFreeLimit = process.env.AI_DAILY_RATE_LIMIT_FREE;
  process.env.AI_DAILY_RATE_LIMIT_FREE = '1000';
});
after(() => {
  if (originalFreeLimit === undefined) {
    delete process.env.AI_DAILY_RATE_LIMIT_FREE;
  } else {
    process.env.AI_DAILY_RATE_LIMIT_FREE = originalFreeLimit;
  }
});

describe('AI explanation endpoint', () => {
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
    const res = await fetch(`${baseUrl}/api/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'deployed', context: 'a CI/CD pipeline' }),
    });
    assert.equal(res.status, 401);
  });

  test('rejects a request missing word or context', async () => {
    const res = await fetch(`${baseUrl}/api/ai/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ word: 'deployed' }),
    });
    assert.equal(res.status, 400);
  });

  test('returns 503 when ANTHROPIC_API_KEY is not configured', async () => {
    // This environment genuinely has no ANTHROPIC_API_KEY configured, so
    // this exercises the real guard rather than a mocked one.
    assert.ok(!process.env.ANTHROPIC_API_KEY);

    const res = await fetch(`${baseUrl}/api/ai/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ word: 'deployed', context: 'a CI/CD pipeline' }),
    });

    assert.equal(res.status, 503);
    const data = await res.json();
    assert.match(data.error, /ANTHROPIC_API_KEY/);
  });

  test('serves a cached explanation without needing ANTHROPIC_API_KEY', async () => {
    // Proves the cache-first path for real: seed Redis directly with the
    // exact key explainWord would use, then confirm the endpoint returns it
    // (200, not 503) even with no AI key configured.
    await setCache(explainCacheKey('rollback', 'reverting a bad deploy'), {
      explanation: 'Rollback: voltar para a versao anterior.',
    });

    const res = await fetch(`${baseUrl}/api/ai/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ word: 'rollback', context: 'reverting a bad deploy' }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.explanation, 'Rollback: voltar para a versao anterior.');
    assert.equal(data.cached, true);
  });
});

describe('AI chat endpoint', () => {
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
    const res = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'oi' }] }),
    });
    assert.equal(res.status, 401);
  });

  test('rejects a request with no messages', async () => {
    const res = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ messages: [] }),
    });
    assert.equal(res.status, 400);
  });

  test('returns 503 when ANTHROPIC_API_KEY is not configured', async () => {
    assert.ok(!process.env.ANTHROPIC_API_KEY);

    const res = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'oi' }] }),
    });

    assert.equal(res.status, 503);
    const data = await res.json();
    assert.match(data.error, /ANTHROPIC_API_KEY/);
  });
});

describe('Chat feedback endpoint (Dia 38)', () => {
  let server;
  let baseUrl;
  let accessToken;
  let userId;
  let otherAccessToken;
  let otherUserId;
  let messageId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());

    const registered = await registerTestUser(baseUrl);
    accessToken = registered.accessToken;
    userId = registered.user.id;

    const other = await registerTestUser(baseUrl);
    otherAccessToken = other.accessToken;
    otherUserId = other.user.id;

    const { rows } = await pool.query(
      `INSERT INTO chat_messages (user_id, message, response) VALUES ($1, 'oi', 'ola') RETURNING id`,
      [userId],
    );
    messageId = rows[0].id;
  });

  after(async () => {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [otherUserId]);
    await stopTestServer(server);
  });

  function patchFeedback(token, id, feedback) {
    return fetch(`${baseUrl}/api/ai/chat/${id}/feedback`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ feedback }),
    });
  }

  test('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/ai/chat/${messageId}/feedback`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback: 'helpful' }),
    });
    assert.equal(res.status, 401);
  });

  test('rejects an invalid feedback value', async () => {
    const res = await patchFeedback(accessToken, messageId, 'super helpful');
    assert.equal(res.status, 400);
  });

  test('returns 404 when the message belongs to a different user', async () => {
    const res = await patchFeedback(otherAccessToken, messageId, 'helpful');
    assert.equal(res.status, 404);
  });

  test('returns 404 for a message that does not exist', async () => {
    const res = await patchFeedback(accessToken, '00000000-0000-0000-0000-000000000000', 'helpful');
    assert.equal(res.status, 404);
  });

  test('persists the feedback for the message owner', async () => {
    const res = await patchFeedback(accessToken, messageId, 'helpful');
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.deepEqual(data, { id: messageId, feedback: 'helpful' });

    const { rows } = await pool.query('SELECT feedback FROM chat_messages WHERE id = $1', [
      messageId,
    ]);
    assert.equal(rows[0].feedback, 'helpful');
  });

  test('clearing feedback back to null is allowed', async () => {
    const res = await patchFeedback(accessToken, messageId, null);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.feedback, null);
  });
});

describe('aiService.buildChatContext', () => {
  let audiobookId;
  let chapterId;
  let wordId;

  before(async () => {
    audiobookId = randomUUID();
    chapterId = randomUUID();
    wordId = randomUUID();

    await pool.query(`INSERT INTO audiobooks (id, title) VALUES ($1, 'Test Audiobook')`, [
      audiobookId,
    ]);
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index, transcript)
       VALUES ($1, $2, 'Daily Standup', 1, 'Yesterday I deployed a new version.')`,
      [chapterId, audiobookId],
    );
    await pool.query(
      `INSERT INTO words (id, word, chapter_id, portuguese_translation, technical_explanation)
       VALUES ($1, 'deployed', $2, 'implantado', 'Colocar codigo em producao.')`,
      [wordId, chapterId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM audiobooks WHERE id = $1', [audiobookId]);
  });

  test('returns an empty string when neither chapterId nor wordId is given', async () => {
    const context = await buildChatContext();
    assert.equal(context, '');
  });

  test('includes the chapter title and transcript when chapterId is given', async () => {
    const context = await buildChatContext(chapterId);
    assert.match(context, /Daily Standup/);
    assert.match(context, /Yesterday I deployed a new version\./);
  });

  test('also includes the word translation and explanation when wordId is given', async () => {
    const context = await buildChatContext(chapterId, wordId);
    assert.match(context, /deployed/);
    assert.match(context, /implantado/);
    assert.match(context, /Colocar codigo em producao\./);
  });

  test('silently ignores an id that does not exist', async () => {
    const context = await buildChatContext(randomUUID());
    assert.equal(context, '');
  });
});

describe('AI remedial endpoint', () => {
  let server;
  let baseUrl;
  let accessToken;
  let userId;
  let audiobookId;
  let chapterId;
  let chapterWithoutTranscriptId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
    const registered = await registerTestUser(baseUrl);
    accessToken = registered.accessToken;
    userId = registered.user.id;

    audiobookId = randomUUID();
    chapterId = randomUUID();
    chapterWithoutTranscriptId = randomUUID();

    await pool.query(`INSERT INTO audiobooks (id, title) VALUES ($1, 'Test Audiobook')`, [
      audiobookId,
    ]);
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index, transcript)
       VALUES ($1, $2, 'Daily Standup', 1, 'Yesterday I deployed a new version.')`,
      [chapterId, audiobookId],
    );
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index)
       VALUES ($1, $2, 'No Transcript Yet', 2)`,
      [chapterWithoutTranscriptId, audiobookId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM audiobooks WHERE id = $1', [audiobookId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await stopTestServer(server);
  });

  test('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/ai/remedial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId }),
    });
    assert.equal(res.status, 401);
  });

  test('rejects a request with no chapterId', async () => {
    const res = await fetch(`${baseUrl}/api/ai/remedial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });

  test('returns 404 for a chapter that does not exist', async () => {
    const res = await fetch(`${baseUrl}/api/ai/remedial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ chapterId: randomUUID() }),
    });
    assert.equal(res.status, 404);
  });

  test('returns 422 for a chapter with no transcript', async () => {
    const res = await fetch(`${baseUrl}/api/ai/remedial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ chapterId: chapterWithoutTranscriptId }),
    });
    assert.equal(res.status, 422);
  });

  test('returns 503 when ANTHROPIC_API_KEY is not configured', async () => {
    assert.ok(!process.env.ANTHROPIC_API_KEY);

    const res = await fetch(`${baseUrl}/api/ai/remedial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ chapterId }),
    });

    assert.equal(res.status, 503);
    const data = await res.json();
    assert.match(data.error, /ANTHROPIC_API_KEY/);
  });

  test('serves cached remedial content without needing ANTHROPIC_API_KEY', async () => {
    await setCache(remedialCacheKey(chapterId), {
      summary: 'Resumo em cache.',
      keywords: ['deploy'],
      exercise: 'Use "deployed" em uma frase.',
    });

    const res = await fetch(`${baseUrl}/api/ai/remedial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ chapterId }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.summary, 'Resumo em cache.');
    assert.equal(data.cached, true);
  });
});

// A genuine runtime AI failure (Anthropic outage/rate limit/network error)
// is simulated by mocking client.messages.create to throw, with a temporary
// ANTHROPIC_API_KEY so the 503 "not configured" guard doesn't short-circuit
// before the call is even attempted - distinct from that guard, which is a
// deployment/config signal, not a runtime failure (Dia 39).
describe('AI fallback content when a real AI call fails (Dia 39)', () => {
  let server;
  let baseUrl;
  let accessToken;
  let userId;
  let audiobookId;
  let chapterId;
  let originalKey;

  before(async () => {
    originalKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-key-for-fallback-tests';

    ({ server, baseUrl } = await startTestServer());
    const registered = await registerTestUser(baseUrl);
    accessToken = registered.accessToken;
    userId = registered.user.id;

    audiobookId = randomUUID();
    chapterId = randomUUID();
    await pool.query(`INSERT INTO audiobooks (id, title) VALUES ($1, 'Test Audiobook')`, [
      audiobookId,
    ]);
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index, transcript)
       VALUES ($1, $2, 'Daily Standup', 1, 'Yesterday I deployed a new version.')`,
      [chapterId, audiobookId],
    );
  });

  after(async () => {
    process.env.ANTHROPIC_API_KEY = originalKey;
    await pool.query('DELETE FROM audiobooks WHERE id = $1', [audiobookId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await stopTestServer(server);
  });

  test('explain falls back to the technical dictionary instead of erroring', async () => {
    const createMock = mock.method(client.messages, 'create', async () => {
      throw new Error('simulated Anthropic outage');
    });

    try {
      const res = await fetch(`${baseUrl}/api/ai/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        // "deployed" is seeded into technical_dictionary by migration 005.
        body: JSON.stringify({ word: 'deployed', context: 'a unique uncached context xyz' }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.fallback, true);
      assert.equal(data.source, 'dictionary');
      assert.match(data.explanation, /deploy/i);
    } finally {
      createMock.mock.restore();
    }
  });

  test('chat falls back to FAQ content and does not persist a fake reply', async () => {
    const createMock = mock.method(client.messages, 'create', async () => {
      throw new Error('simulated Anthropic outage');
    });

    try {
      const { rows: before } = await pool.query(
        'SELECT COUNT(*)::int AS count FROM chat_messages WHERE user_id = $1',
        [userId],
      );

      const res = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'oi' }] }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.fallback, true);
      assert.equal(typeof data.reply, 'string');
      assert.equal(data.messageId, undefined);

      const { rows: after } = await pool.query(
        'SELECT COUNT(*)::int AS count FROM chat_messages WHERE user_id = $1',
        [userId],
      );
      assert.equal(after[0].count, before[0].count);
    } finally {
      createMock.mock.restore();
    }
  });

  test('remedial falls back to FAQ content', async () => {
    const createMock = mock.method(client.messages, 'create', async () => {
      throw new Error('simulated Anthropic outage');
    });

    try {
      const res = await fetch(`${baseUrl}/api/ai/remedial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ chapterId }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.fallback, true);
      assert.equal(typeof data.summary, 'string');
      assert.deepEqual(data.keywords, []);
    } finally {
      createMock.mock.restore();
    }
  });
});

// Click-any-word-to-translate: resolves any word to a real `words` row,
// three tiers cheapest first (existing row > technical_dictionary > AI).
describe('POST /api/ai/translate-word', () => {
  let server;
  let baseUrl;
  let accessToken;
  let userId;
  let audiobookId;
  let chapterId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
    const registered = await registerTestUser(baseUrl);
    accessToken = registered.accessToken;
    userId = registered.user.id;

    audiobookId = randomUUID();
    chapterId = randomUUID();
    await pool.query(`INSERT INTO audiobooks (id, title) VALUES ($1, 'Translate Test Book')`, [
      audiobookId,
    ]);
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index, transcript)
       VALUES ($1, $2, 'Chapter 1', 1, 'She showed real grit finishing the project alone.')`,
      [chapterId, audiobookId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM technical_dictionary WHERE word = $1', ['grit']);
    await pool.query('DELETE FROM audiobooks WHERE id = $1', [audiobookId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await stopTestServer(server);
  });

  test('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/ai/translate-word`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'grit', context: 'sentence', chapterId }),
    });
    assert.equal(res.status, 401);
  });

  test('returns an existing words row for this chapter without calling AI', async () => {
    const createMock = mock.method(client.messages, 'create', async () => {
      throw new Error('should not be called');
    });
    try {
      // Seed a words row directly to prove the existing-row short-circuit.
      const { rows } = await pool.query(
        `INSERT INTO words (word, chapter_id, portuguese_translation)
         VALUES ('grit', $1, 'determinacao') RETURNING id`,
        [chapterId],
      );

      const res = await fetch(`${baseUrl}/api/ai/translate-word`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ word: 'grit', context: 'sentence', chapterId }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.id, rows[0].id);
      assert.equal(data.portuguese_translation, 'determinacao');
      assert.equal(createMock.mock.callCount(), 0);
    } finally {
      createMock.mock.restore();
      await pool.query('DELETE FROM words WHERE chapter_id = $1', [chapterId]);
    }
  });

  test('falls back to technical_dictionary and creates a words row, without calling AI', async () => {
    const createMock = mock.method(client.messages, 'create', async () => {
      throw new Error('should not be called');
    });
    try {
      // "deployed" is seeded into technical_dictionary by migration 005.
      const res = await fetch(`${baseUrl}/api/ai/translate-word`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          word: 'deployed',
          context: 'She deployed the fix.',
          chapterId,
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.match(data.portuguese_translation, /implant/i);
      assert.equal(createMock.mock.callCount(), 0);

      const { rows } = await pool.query(
        'SELECT id FROM words WHERE word = $1 AND chapter_id = $2',
        ['deployed', chapterId],
      );
      assert.equal(rows.length, 1);
    } finally {
      createMock.mock.restore();
      await pool.query('DELETE FROM words WHERE chapter_id = $1', [chapterId]);
    }
  });

  test('calls AI for a genuinely new word and seeds technical_dictionary for future hits', async () => {
    const createMock = mock.method(client.messages, 'create', async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            part_of_speech: 'substantivo',
            portuguese_translation: 'determinacao',
            technical_explanation: 'Coragem e persistencia diante de dificuldades.',
            example_sentence: 'She showed real grit finishing the project alone.',
          }),
        },
      ],
      usage: { input_tokens: 10, output_tokens: 10 },
    }));

    try {
      const res = await fetch(`${baseUrl}/api/ai/translate-word`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          word: 'grit',
          context: 'She showed real grit finishing the project alone.',
          chapterId,
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.portuguese_translation, 'determinacao');
      assert.equal(data.part_of_speech, 'substantivo');
      assert.equal(createMock.mock.callCount(), 1);

      const dictionaryRow = await pool.query('SELECT * FROM technical_dictionary WHERE word = $1', [
        'grit',
      ]);
      assert.equal(dictionaryRow.rows.length, 1);

      const wordsRow = await pool.query(
        'SELECT id FROM words WHERE word = $1 AND chapter_id = $2',
        ['grit', chapterId],
      );
      assert.equal(wordsRow.rows.length, 1);
    } finally {
      createMock.mock.restore();
      await pool.query('DELETE FROM words WHERE chapter_id = $1', [chapterId]);
    }
  });

  test('returns 400 when word, context, or chapterId is missing', async () => {
    const res = await fetch(`${baseUrl}/api/ai/translate-word`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ word: 'grit' }),
    });
    assert.equal(res.status, 400);
  });
});

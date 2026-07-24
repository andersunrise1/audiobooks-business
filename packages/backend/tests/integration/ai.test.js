import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/config/database.js';
import {
  buildChatContext,
  explainCacheKey,
  remedialCacheKey,
} from '../../src/services/aiService.js';
import { setCache } from '../../src/services/cacheService.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

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

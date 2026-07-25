import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/config/database.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('Free-tier audiobook paywall (Dia 49)', () => {
  let server;
  let baseUrl;
  let freeAudiobookId;
  let paidAudiobookId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());

    freeAudiobookId = randomUUID();
    paidAudiobookId = randomUUID();

    await pool.query(
      `INSERT INTO audiobooks (id, title, is_free) VALUES ($1, 'Free Test Audiobook', true)`,
      [freeAudiobookId],
    );
    await pool.query(
      `INSERT INTO audiobooks (id, title, is_free) VALUES ($1, 'Paid Test Audiobook', false)`,
      [paidAudiobookId],
    );
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index, transcript) VALUES ($1, $2, 'Chapter 1', 1, 'Hello there.')`,
      [randomUUID(), freeAudiobookId],
    );
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index, transcript) VALUES ($1, $2, 'Chapter 1', 1, 'Hello there.')`,
      [randomUUID(), paidAudiobookId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM audiobooks WHERE id = ANY($1)', [
      [freeAudiobookId, paidAudiobookId],
    ]);
    await stopTestServer(server);
  });

  test('lists is_free on GET /api/audiobooks', async () => {
    const res = await fetch(`${baseUrl}/api/audiobooks`);
    const books = await res.json();
    const free = books.find((b) => b.id === freeAudiobookId);
    const paid = books.find((b) => b.id === paidAudiobookId);
    assert.equal(free.is_free, true);
    assert.equal(paid.is_free, false);
  });

  test('a free audiobook is playable by an anonymous caller', async () => {
    const res = await fetch(`${baseUrl}/api/audiobooks/${freeAudiobookId}/chapters`);
    assert.equal(res.status, 200);
    const chapters = await res.json();
    assert.equal(chapters.length, 1);
  });

  test('a paid audiobook is blocked for an anonymous caller', async () => {
    const res = await fetch(`${baseUrl}/api/audiobooks/${paidAudiobookId}/chapters`);
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /Vitalicio/);
  });

  test('a paid audiobook is blocked for an authenticated free-plan user', async () => {
    const { accessToken, user } = await registerTestUser(baseUrl);
    try {
      const res = await fetch(`${baseUrl}/api/audiobooks/${paidAudiobookId}/chapters`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      assert.equal(res.status, 403);
    } finally {
      await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
    }
  });

  test('a paid audiobook is playable by an authenticated pro-plan user', async () => {
    const { accessToken, user } = await registerTestUser(baseUrl);
    await pool.query(`UPDATE users SET plan = 'pro' WHERE id = $1`, [user.id]);

    try {
      const res = await fetch(`${baseUrl}/api/audiobooks/${paidAudiobookId}/chapters`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      assert.equal(res.status, 200);
      const chapters = await res.json();
      assert.equal(chapters.length, 1);
    } finally {
      await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
    }
  });

  test('returns 404 for a nonexistent audiobook', async () => {
    const res = await fetch(`${baseUrl}/api/audiobooks/${randomUUID()}/chapters`);
    assert.equal(res.status, 404);
  });
});

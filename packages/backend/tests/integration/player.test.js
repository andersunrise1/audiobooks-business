import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/config/database.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('Audio Player', () => {
  let server;
  let baseUrl;
  let user;
  let audiobookId;
  let chapterId;
  let wordId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
    user = await registerTestUser(baseUrl);

    audiobookId = randomUUID();
    chapterId = randomUUID();
    wordId = randomUUID();

    await pool.query(`INSERT INTO audiobooks (id, title) VALUES ($1, 'Test Audiobook')`, [
      audiobookId,
    ]);
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index, audio_url, duration_seconds, transcript)
       VALUES ($1, $2, 'Test Chapter', 1, 'https://example.com/audio.mp3', 10, 'We deployed it.')`,
      [chapterId, audiobookId],
    );
    await pool.query(
      `INSERT INTO words (id, word, chapter_id, start_seconds, end_seconds)
       VALUES ($1, 'deployed', $2, 1, 2)`,
      [wordId, chapterId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM audiobooks WHERE id = $1', [audiobookId]);
    await pool.query('DELETE FROM users WHERE id = $1', [user.user.id]);
    await stopTestServer(server);
  });

  test('should sync words with audio', async () => {
    const res = await fetch(`${baseUrl}/api/audiobooks/chapters/${chapterId}/words`);
    assert.equal(res.status, 200);

    const words = await res.json();
    assert.equal(words.length, 1);
    assert.equal(words[0].word, 'deployed');
    assert.equal(Number(words[0].start_seconds), 1);
    assert.equal(Number(words[0].end_seconds), 2);
  });

  test('should save clicked words', async () => {
    const res = await fetch(`${baseUrl}/api/user/words-learned`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.accessToken}`,
      },
      body: JSON.stringify({ chapterId, wordId }),
    });

    assert.equal(res.status, 201);

    const { rows: clicks } = await pool.query('SELECT * FROM word_clicks WHERE word_id = $1', [
      wordId,
    ]);
    assert.equal(clicks.length, 1);

    const { rows: flashcards } = await pool.query('SELECT * FROM flashcards WHERE word_id = $1', [
      wordId,
    ]);
    assert.equal(flashcards.length, 1);
  });
});

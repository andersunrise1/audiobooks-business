import { after, before, describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/config/database.js';
import { s3Client } from '../../src/config/s3.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('POST /api/admin/audiobooks', () => {
  let server;
  let baseUrl;
  let adminAccessToken;
  let adminUserId;
  let plainAccessToken;
  let plainUserId;
  let createdAudiobookId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());

    const admin = await registerTestUser(baseUrl);
    adminAccessToken = admin.accessToken;
    adminUserId = admin.user.id;
    await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [adminUserId]);

    const plain = await registerTestUser(baseUrl);
    plainAccessToken = plain.accessToken;
    plainUserId = plain.user.id;
  });

  after(async () => {
    if (createdAudiobookId) {
      await pool.query('DELETE FROM audiobooks WHERE id = $1', [createdAudiobookId]);
    }
    await pool.query('DELETE FROM users WHERE id = $1', [adminUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [plainUserId]);
    await stopTestServer(server);
  });

  function buildForm(overrides = {}) {
    const form = new FormData();
    form.set('title', overrides.title ?? 'Test Upload Audiobook');
    form.set('transcript', overrides.transcript ?? 'We deployed a new feature.');

    if (overrides.wordsMetadata !== null) {
      form.set(
        'words_metadata',
        overrides.wordsMetadata ??
          JSON.stringify([{ word: 'deployed', start_seconds: 0.5, end_seconds: 1 }]),
      );
    }

    if (overrides.skipFile !== true) {
      const blob = new Blob([overrides.fileContent ?? 'fake audio bytes'], {
        type: overrides.mimetype ?? 'audio/mpeg',
      });
      form.set('audio_file', blob, 'test.mp3');
    }

    return form;
  }

  test('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/admin/audiobooks`, {
      method: 'POST',
      body: buildForm(),
    });
    assert.equal(res.status, 401);
  });

  test('rejects a non-admin user', async () => {
    const res = await fetch(`${baseUrl}/api/admin/audiobooks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${plainAccessToken}` },
      body: buildForm(),
    });
    assert.equal(res.status, 403);
  });

  test('rejects a request missing title', async () => {
    const res = await fetch(`${baseUrl}/api/admin/audiobooks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: buildForm({ title: '' }),
    });
    assert.equal(res.status, 400);
  });

  test('rejects a request missing the audio file', async () => {
    const res = await fetch(`${baseUrl}/api/admin/audiobooks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: buildForm({ skipFile: true }),
    });
    assert.equal(res.status, 400);
  });

  test('rejects an unsupported audio format', async () => {
    const res = await fetch(`${baseUrl}/api/admin/audiobooks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: buildForm({ mimetype: 'image/png' }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /unsupported audio format/);
  });

  test('rejects malformed words_metadata', async () => {
    const res = await fetch(`${baseUrl}/api/admin/audiobooks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: buildForm({ wordsMetadata: 'not json' }),
    });
    assert.equal(res.status, 400);
  });

  test('returns 503 when AWS S3 is not configured', async () => {
    assert.ok(!process.env.AWS_ACCESS_KEY_ID);

    const res = await fetch(`${baseUrl}/api/admin/audiobooks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: buildForm(),
    });
    assert.equal(res.status, 503);
    const data = await res.json();
    assert.match(data.error, /AWS S3/);
  });

  test('creates the audiobook, chapter, and tagged words on a successful upload', async () => {
    const originalEnv = {
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_REGION: process.env.AWS_REGION,
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    };
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_S3_BUCKET = 'test-bucket';

    const sendMock = mock.method(s3Client, 'send', async () => ({}));

    try {
      const res = await fetch(`${baseUrl}/api/admin/audiobooks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminAccessToken}` },
        body: buildForm({ title: 'Real Upload Test' }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.audiobookId);
      assert.ok(data.chapterId);
      assert.match(data.audioUrl, /^https:\/\/test-bucket\.s3\.us-east-1\.amazonaws\.com\//);
      createdAudiobookId = data.audiobookId;

      const { rows: words } = await pool.query(
        'SELECT word, start_seconds, end_seconds FROM words WHERE chapter_id = $1',
        [data.chapterId],
      );
      assert.equal(words.length, 1);
      assert.equal(words[0].word, 'deployed');
      assert.equal(Number(words[0].start_seconds), 0.5);
    } finally {
      sendMock.mock.restore();
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});

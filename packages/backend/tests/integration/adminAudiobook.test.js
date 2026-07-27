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
      assert.equal(data.publishedAt, null);
      createdAudiobookId = data.audiobookId;

      const { rows: words } = await pool.query(
        'SELECT word, start_seconds, end_seconds FROM words WHERE chapter_id = $1',
        [data.chapterId],
      );
      assert.equal(words.length, 1);
      assert.equal(words[0].word, 'deployed');
      assert.equal(Number(words[0].start_seconds), 0.5);

      const { rows: bookRows } = await pool.query(
        'SELECT published_at FROM audiobooks WHERE id = $1',
        [data.audiobookId],
      );
      assert.equal(bookRows[0].published_at, null);
    } finally {
      sendMock.mock.restore();
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  test('accepts a publishedAt to schedule the upload instead of leaving it a draft', async () => {
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
    const scheduledFor = new Date(Date.now() + 86400000).toISOString();
    let scheduledAudiobookId;

    try {
      const form = buildForm({ title: 'Scheduled Upload Test' });
      form.set('publishedAt', scheduledFor);

      const res = await fetch(`${baseUrl}/api/admin/audiobooks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminAccessToken}` },
        body: form,
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.publishedAt, scheduledFor);
      scheduledAudiobookId = data.audiobookId;
    } finally {
      sendMock.mock.restore();
      if (scheduledAudiobookId) {
        await pool.query('DELETE FROM audiobooks WHERE id = $1', [scheduledAudiobookId]);
      }
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  test('rejects an invalid publishedAt', async () => {
    const res = await fetch(`${baseUrl}/api/admin/audiobooks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: (() => {
        const form = buildForm();
        form.set('publishedAt', 'not-a-date');
        return form;
      })(),
    });
    assert.equal(res.status, 400);
  });
});

describe('Admin content CMS endpoints (Dia 51-52)', () => {
  let server;
  let baseUrl;
  let adminAccessToken;
  let adminUserId;
  let plainAccessToken;
  let plainUserId;
  let draftId;
  let publishedId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());

    const admin = await registerTestUser(baseUrl);
    adminAccessToken = admin.accessToken;
    adminUserId = admin.user.id;
    await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [adminUserId]);

    const plain = await registerTestUser(baseUrl);
    plainAccessToken = plain.accessToken;
    plainUserId = plain.user.id;

    const { rows: draftRows } = await pool.query(
      `INSERT INTO audiobooks (title, published_at) VALUES ('CMS Draft Test', NULL) RETURNING id`,
    );
    draftId = draftRows[0].id;
    await pool.query(
      `INSERT INTO chapters (audiobook_id, title, order_index, transcript) VALUES ($1, 'Chapter 1', 1, 'Draft content.')`,
      [draftId],
    );

    const { rows: publishedRows } = await pool.query(
      `INSERT INTO audiobooks (title) VALUES ('CMS Published Test') RETURNING id`,
    );
    publishedId = publishedRows[0].id;
  });

  after(async () => {
    await pool.query('DELETE FROM audiobooks WHERE id = ANY($1)', [[draftId, publishedId]]);
    await pool.query('DELETE FROM users WHERE id = $1', [adminUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [plainUserId]);
    await stopTestServer(server);
  });

  test('GET /api/admin/audiobooks lists drafts and published audiobooks alike', async () => {
    const res = await fetch(`${baseUrl}/api/admin/audiobooks`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert.equal(res.status, 200);
    const books = await res.json();
    const draft = books.find((b) => b.id === draftId);
    const published = books.find((b) => b.id === publishedId);
    assert.equal(draft.published_at, null);
    assert.ok(published.published_at);
  });

  test('GET /api/admin/audiobooks rejects a non-admin user', async () => {
    const res = await fetch(`${baseUrl}/api/admin/audiobooks`, {
      headers: { Authorization: `Bearer ${plainAccessToken}` },
    });
    assert.equal(res.status, 403);
  });

  test('GET /api/admin/audiobooks/:id previews a draft with its chapters, bypassing the public gate', async () => {
    const res = await fetch(`${baseUrl}/api/admin/audiobooks/${draftId}`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.title, 'CMS Draft Test');
    assert.equal(data.chapters.length, 1);
    assert.equal(data.chapters[0].transcript, 'Draft content.');
  });

  test('a draft audiobook does not appear in the public catalog', async () => {
    const listRes = await fetch(`${baseUrl}/api/audiobooks`);
    const books = await listRes.json();
    assert.ok(!books.some((b) => b.id === draftId));

    const chaptersRes = await fetch(`${baseUrl}/api/audiobooks/${draftId}/chapters`);
    assert.equal(chaptersRes.status, 404);
  });

  test('POST /api/admin/audiobooks/:id/publish publishes a draft immediately by default', async () => {
    const res = await fetch(`${baseUrl}/api/admin/audiobooks/${draftId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.published_at);

    const listRes = await fetch(`${baseUrl}/api/audiobooks`);
    const books = await listRes.json();
    assert.ok(books.some((b) => b.id === draftId));
  });

  test('POST /api/admin/audiobooks/:id/publish can schedule a future date', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const res = await fetch(`${baseUrl}/api/admin/audiobooks/${draftId}/publish`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publishedAt: futureDate }),
    });
    assert.equal(res.status, 200);

    const listRes = await fetch(`${baseUrl}/api/audiobooks`);
    const books = await listRes.json();
    assert.ok(!books.some((b) => b.id === draftId), 'scheduled-for-the-future stays hidden');
  });

  test('POST /api/admin/audiobooks/:id/unpublish reverts to draft', async () => {
    const res = await fetch(`${baseUrl}/api/admin/audiobooks/${publishedId}/unpublish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.published_at, null);

    const listRes = await fetch(`${baseUrl}/api/audiobooks`);
    const books = await listRes.json();
    assert.ok(!books.some((b) => b.id === publishedId));
  });

  test('publish/unpublish return 404 for a nonexistent audiobook', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const publishRes = await fetch(`${baseUrl}/api/admin/audiobooks/${fakeId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert.equal(publishRes.status, 404);

    const unpublishRes = await fetch(`${baseUrl}/api/admin/audiobooks/${fakeId}/unpublish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert.equal(unpublishRes.status, 404);
  });
});

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/config/database.js';
import {
  getNextChapterRecommendation,
  getRecommendedAudiobook,
  getBestStudyHour,
} from '../../src/services/recommendationService.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('recommendationService.getNextChapterRecommendation', () => {
  let audiobookId;
  let chapter1Id;
  let chapter2Id;
  let chapter3Id;
  let otherAudiobookId;
  let otherChapterId;
  let userId;

  before(async () => {
    audiobookId = randomUUID();
    chapter1Id = randomUUID();
    chapter2Id = randomUUID();
    chapter3Id = randomUUID();
    otherAudiobookId = randomUUID();
    otherChapterId = randomUUID();
    userId = randomUUID();

    await pool.query(`INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'unused')`, [
      userId,
      `recommend-${userId}@techspeak.test`,
    ]);
    await pool.query(
      `INSERT INTO audiobooks (id, title) VALUES ($1, 'Main Book'), ($2, 'Other Book')`,
      [audiobookId, otherAudiobookId],
    );
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index) VALUES
       ($1, $4, 'Ch1', 1), ($2, $4, 'Ch2', 2), ($3, $4, 'Ch3', 3),
       ($5, $6, 'Other Ch1', 1)`,
      [chapter1Id, chapter2Id, chapter3Id, audiobookId, otherChapterId, otherAudiobookId],
    );

    // Older progress on the "other" audiobook, more recent on the main one -
    // the recommendation should follow the most recently accessed audiobook.
    await pool.query(
      `INSERT INTO user_progress (user_id, chapter_id, completed, last_accessed) VALUES
       ($1, $2, true, now() - interval '10 days')`,
      [userId, otherChapterId],
    );
    await pool.query(
      `INSERT INTO user_progress (user_id, chapter_id, completed, last_accessed) VALUES
       ($1, $2, true, now()), ($1, $3, false, now())`,
      [userId, chapter1Id, chapter2Id],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM audiobooks WHERE id = ANY($1)', [
      [audiobookId, otherAudiobookId],
    ]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  });

  test('recommends the lowest incomplete chapter in the most recently accessed audiobook', async () => {
    const result = await getNextChapterRecommendation(userId);
    assert.deepEqual(result, {
      audiobookId,
      audiobookTitle: 'Main Book',
      chapterId: chapter2Id,
      chapterTitle: 'Ch2',
      orderIndex: 2,
    });
  });

  test('returns null for a user with no progress at all', async () => {
    const result = await getNextChapterRecommendation(randomUUID());
    assert.equal(result, null);
  });
});

describe('recommendationService.getRecommendedAudiobook', () => {
  let matchingAudiobookId;
  let nonMatchingAudiobookId;
  let startedAudiobookId;
  let startedChapterId;
  let userId;

  before(async () => {
    matchingAudiobookId = randomUUID();
    nonMatchingAudiobookId = randomUUID();
    startedAudiobookId = randomUUID();
    startedChapterId = randomUUID();
    userId = randomUUID();

    await pool.query(`INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'unused')`, [
      userId,
      `recommend-audiobook-${userId}@techspeak.test`,
    ]);
    await pool.query(
      `INSERT INTO audiobooks (id, title, category, level) VALUES
       ($1, 'Matching Book', 'Backend', 'intermediate'),
       ($2, 'Non Matching Book', 'Frontend', 'beginner'),
       ($3, 'Started Book', 'Backend', 'intermediate')`,
      [matchingAudiobookId, nonMatchingAudiobookId, startedAudiobookId],
    );
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index) VALUES ($1, $2, 'Ch1', 1)`,
      [startedChapterId, startedAudiobookId],
    );
    await pool.query(
      `INSERT INTO user_progress (user_id, chapter_id, completed) VALUES ($1, $2, true)`,
      [userId, startedChapterId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM audiobooks WHERE id = ANY($1)', [
      [matchingAudiobookId, nonMatchingAudiobookId, startedAudiobookId],
    ]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  });

  test('recommends an unstarted audiobook matching the category/level the user already engages with', async () => {
    const result = await getRecommendedAudiobook(userId);
    assert.equal(result.audiobookId, matchingAudiobookId);
    assert.equal(result.matchesPreference, true);
  });

  test('never recommends an audiobook the user has already started', async () => {
    const result = await getRecommendedAudiobook(userId);
    assert.notEqual(result.audiobookId, startedAudiobookId);
  });
});

describe('recommendationService.getBestStudyHour', () => {
  let audiobookId;
  let chapterId;
  let wordId;
  let userId;

  before(async () => {
    audiobookId = randomUUID();
    chapterId = randomUUID();
    wordId = randomUUID();
    userId = randomUUID();

    await pool.query(`INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'unused')`, [
      userId,
      `recommend-hour-${userId}@techspeak.test`,
    ]);
    await pool.query(`INSERT INTO audiobooks (id, title) VALUES ($1, 'Book')`, [audiobookId]);
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index) VALUES ($1, $2, 'Ch', 1)`,
      [chapterId, audiobookId],
    );
    await pool.query(`INSERT INTO words (id, word, chapter_id) VALUES ($1, 'deploy', $2)`, [
      wordId,
      chapterId,
    ]);

    // 3 clicks at hour 14, 1 click at hour 9 - 14 should win.
    await pool.query(
      `INSERT INTO word_clicks (user_id, word_id, chapter_id, created_at) VALUES
       ($1, $2, $3, date_trunc('day', now()) + interval '14 hours'),
       ($1, $2, $3, date_trunc('day', now()) + interval '14 hours 5 minutes'),
       ($1, $2, $3, date_trunc('day', now()) + interval '14 hours 10 minutes'),
       ($1, $2, $3, date_trunc('day', now()) + interval '9 hours')`,
      [userId, wordId, chapterId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM audiobooks WHERE id = $1', [audiobookId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  });

  test('picks the hour with the most activity', async () => {
    const result = await getBestStudyHour(userId);
    assert.deepEqual(result, { hour: 14, activityCount: 3 });
  });

  test('returns null for a user with no click history', async () => {
    const result = await getBestStudyHour(randomUUID());
    assert.equal(result, null);
  });
});

describe('GET /api/user/recommendations', () => {
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
    const res = await fetch(`${baseUrl}/api/user/recommendations`);
    assert.equal(res.status, 401);
  });

  test('returns nulls for a brand-new user with no activity yet', async () => {
    const res = await fetch(`${baseUrl}/api/user/recommendations`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.deepEqual(data, {
      nextChapter: null,
      recommendedAudiobook: data.recommendedAudiobook, // may be any seeded audiobook; shape checked below
      bestStudyHour: null,
    });
    assert.ok(
      data.recommendedAudiobook === null || typeof data.recommendedAudiobook.title === 'string',
    );
  });
});

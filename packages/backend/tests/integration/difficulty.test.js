import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/config/database.js';
import {
  getStruggledWords,
  getLowCompletionChapters,
  getFrequentQuestionChapters,
} from '../../src/services/difficultyService.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('difficultyService', () => {
  let audiobookId;
  let chapterEasyId;
  let chapterHardId;
  let wordHardId;
  let wordEasyId;
  let userAId;
  let userBId;

  before(async () => {
    audiobookId = randomUUID();
    chapterEasyId = randomUUID();
    chapterHardId = randomUUID();
    wordHardId = randomUUID();
    wordEasyId = randomUUID();
    userAId = randomUUID();
    userBId = randomUUID();

    await pool.query(
      `INSERT INTO users (id, email, password_hash) VALUES
       ($1, $2, 'unused'), ($3, $4, 'unused')`,
      [
        userAId,
        `difficulty-a-${userAId}@techspeak.test`,
        userBId,
        `difficulty-b-${userBId}@techspeak.test`,
      ],
    );

    await pool.query(`INSERT INTO audiobooks (id, title) VALUES ($1, 'Difficulty Test Book')`, [
      audiobookId,
    ]);
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index) VALUES
       ($1, $3, 'Easy Chapter', 1),
       ($2, $3, 'Hard Chapter', 2)`,
      [chapterEasyId, chapterHardId, audiobookId],
    );
    await pool.query(
      `INSERT INTO words (id, word, chapter_id) VALUES
       ($1, 'rollback', $3),
       ($2, 'commit', $3)`,
      [wordHardId, wordEasyId, chapterHardId],
    );

    // userA clicks "rollback" 3 times (struggling) and "commit" once (not struggling).
    await pool.query(
      `INSERT INTO word_clicks (user_id, word_id, chapter_id) VALUES
       ($1, $2, $4), ($1, $2, $4), ($1, $2, $4), ($1, $3, $4)`,
      [userAId, wordHardId, wordEasyId, chapterHardId],
    );

    // Easy chapter: both users complete it. Hard chapter: only userB completes it.
    await pool.query(
      `INSERT INTO user_progress (user_id, chapter_id, completed) VALUES
       ($1, $3, true), ($2, $3, true),
       ($1, $4, false), ($2, $4, true)`,
      [userAId, userBId, chapterEasyId, chapterHardId],
    );

    // userA asks 2 questions about the hard chapter, 1 about the easy one.
    await pool.query(
      `INSERT INTO chat_messages (user_id, chapter_id, message, response) VALUES
       ($1, $2, 'q1', 'r1'), ($1, $2, 'q2', 'r2'), ($1, $3, 'q3', 'r3')`,
      [userAId, chapterHardId, chapterEasyId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM audiobooks WHERE id = $1', [audiobookId]);
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [[userAId, userBId]]);
  });

  test('getStruggledWords only returns words clicked more than once, ordered by count', async () => {
    const result = await getStruggledWords(userAId);
    assert.deepEqual(result, [{ wordId: wordHardId, word: 'rollback', clickCount: 3 }]);
  });

  test('getStruggledWords returns nothing for a user with no repeated clicks', async () => {
    const result = await getStruggledWords(userBId);
    assert.deepEqual(result, []);
  });

  test('getLowCompletionChapters ranks the hard chapter below the easy one', async () => {
    const result = await getLowCompletionChapters();
    const easy = result.find((c) => c.chapterId === chapterEasyId);
    const hard = result.find((c) => c.chapterId === chapterHardId);

    assert.equal(easy.completionRate, 1);
    assert.equal(hard.completionRate, 0.5);

    const hardIndex = result.findIndex((c) => c.chapterId === chapterHardId);
    const easyIndex = result.findIndex((c) => c.chapterId === chapterEasyId);
    assert.ok(hardIndex < easyIndex);
  });

  test('getFrequentQuestionChapters ranks by question count for that user', async () => {
    const result = await getFrequentQuestionChapters(userAId);
    assert.deepEqual(result, [
      { chapterId: chapterHardId, title: 'Hard Chapter', questionCount: 2 },
      { chapterId: chapterEasyId, title: 'Easy Chapter', questionCount: 1 },
    ]);
  });

  test('getFrequentQuestionChapters returns nothing for a user with no chat history', async () => {
    const result = await getFrequentQuestionChapters(userBId);
    assert.deepEqual(result, []);
  });
});

describe('GET /api/user/difficulty-profile', () => {
  let server;
  let baseUrl;
  let accessToken;
  let userId;
  let audiobookId;
  let chapterId;
  let wordId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
    const registered = await registerTestUser(baseUrl);
    accessToken = registered.accessToken;
    userId = registered.user.id;

    audiobookId = randomUUID();
    chapterId = randomUUID();
    wordId = randomUUID();

    await pool.query(`INSERT INTO audiobooks (id, title) VALUES ($1, 'Profile Test Book')`, [
      audiobookId,
    ]);
    await pool.query(
      `INSERT INTO chapters (id, audiobook_id, title, order_index) VALUES ($1, $2, 'Chapter', 1)`,
      [chapterId, audiobookId],
    );
    await pool.query(`INSERT INTO words (id, word, chapter_id) VALUES ($1, 'deployed', $2)`, [
      wordId,
      chapterId,
    ]);
    await pool.query(
      `INSERT INTO word_clicks (user_id, word_id, chapter_id) VALUES ($1, $2, $3), ($1, $2, $3)`,
      [userId, wordId, chapterId],
    );
    await pool.query(
      `INSERT INTO chat_messages (user_id, chapter_id, message, response) VALUES ($1, $2, 'q', 'r')`,
      [userId, chapterId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM audiobooks WHERE id = $1', [audiobookId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await stopTestServer(server);
  });

  test('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/user/difficulty-profile`);
    assert.equal(res.status, 401);
  });

  test('assembles struggled words, low-completion chapters, and frequent question chapters', async () => {
    const res = await fetch(`${baseUrl}/api/user/difficulty-profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.deepEqual(data.struggledWords, [{ wordId, word: 'deployed', clickCount: 2 }]);
    assert.deepEqual(data.frequentQuestionChapters, [
      { chapterId, title: 'Chapter', questionCount: 1 },
    ]);
    assert.ok(Array.isArray(data.lowCompletionChapters));
  });
});

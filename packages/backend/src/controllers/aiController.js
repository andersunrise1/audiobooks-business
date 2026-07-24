import {
  explainTechnicalTerm,
  chatReply,
  buildChatContext,
  getRemedialContent,
} from '../services/aiService.js';
import { getCache, setCache, hashKey } from '../services/cacheService.js';
import { pool } from '../config/database.js';

export async function explainWord(req, res) {
  const { word, context } = req.body;

  if (!word || !context) {
    return res.status(400).json({ error: 'word and context are required' });
  }

  const cacheKey = `ai:explain:${word.toLowerCase()}:${hashKey(context)}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.json({ word, explanation: cached.explanation, cached: true });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res
      .status(503)
      .json({ error: 'AI service is not configured (missing ANTHROPIC_API_KEY)' });
  }

  const explanation = await explainTechnicalTerm(word, context);
  await setCache(cacheKey, { explanation });
  res.json({ word, explanation });
}

export async function chat(req, res) {
  const { messages, chapterId, wordId } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res
      .status(503)
      .json({ error: 'AI service is not configured (missing ANTHROPIC_API_KEY)' });
  }

  const context = await buildChatContext(chapterId, wordId);
  const reply = await chatReply(messages, context);

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  await pool.query(
    `INSERT INTO chat_messages (user_id, chapter_id, message, response, message_type)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      req.user.id,
      chapterId || null,
      lastUserMessage?.content ?? '',
      reply,
      wordId ? 'vocabulary' : null,
    ],
  );

  res.json({ reply });
}

export async function remedial(req, res) {
  const { chapterId } = req.body;

  if (!chapterId) {
    return res.status(400).json({ error: 'chapterId is required' });
  }

  const cacheKey = `ai:remedial:${chapterId}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  const { rows } = await pool.query('SELECT transcript FROM chapters WHERE id = $1', [chapterId]);
  const chapter = rows[0];

  if (!chapter) {
    return res.status(404).json({ error: 'chapter not found' });
  }

  if (!chapter.transcript) {
    return res.status(422).json({ error: 'chapter has no transcript to summarize' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res
      .status(503)
      .json({ error: 'AI service is not configured (missing ANTHROPIC_API_KEY)' });
  }

  const content = await getRemedialContent(chapter.transcript);
  await setCache(cacheKey, content);
  res.json(content);
}

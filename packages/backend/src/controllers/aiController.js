import {
  explainTechnicalTerm,
  chatReply,
  buildChatContext,
  getRemedialContent,
  explainCacheKey,
  remedialCacheKey,
} from '../services/aiService.js';
import { getCache, setCache } from '../services/cacheService.js';
import {
  getExplainFallback,
  getChatFallback,
  getRemedialFallback,
} from '../services/aiFallbackService.js';
import { pool } from '../config/database.js';

export async function explainWord(req, res) {
  const { word, context } = req.body;

  if (!word || !context) {
    return res.status(400).json({ error: 'word and context are required' });
  }

  const cacheKey = explainCacheKey(word, context);
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.json({ word, explanation: cached.explanation, cached: true });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res
      .status(503)
      .json({ error: 'AI service is not configured (missing ANTHROPIC_API_KEY)' });
  }

  try {
    const explanation = await explainTechnicalTerm(word, context, { userId: req.user.id });
    await setCache(cacheKey, { explanation });
    res.json({ word, explanation });
  } catch (err) {
    console.error('AI explain call failed, serving fallback:', err.message);
    res.json(await getExplainFallback(word));
  }
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

  let reply;
  try {
    reply = await chatReply(messages, context, { userId: req.user.id });
  } catch (err) {
    console.error('AI chat call failed, serving fallback:', err.message);
    // Not persisted to chat_messages - a fallback reply isn't a real tutor
    // turn and would pollute the Dia 38 analytics (questions/satisfaction).
    return res.json(getChatFallback());
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const { rows } = await pool.query(
    `INSERT INTO chat_messages (user_id, chapter_id, message, response, message_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      req.user.id,
      chapterId || null,
      lastUserMessage?.content ?? '',
      reply,
      wordId ? 'vocabulary' : null,
    ],
  );

  res.json({ reply, messageId: rows[0].id });
}

const FEEDBACK_VALUES = [null, 'helpful', 'not_helpful'];

export async function updateChatFeedback(req, res) {
  const { messageId } = req.params;
  const { feedback } = req.body;

  if (!FEEDBACK_VALUES.includes(feedback)) {
    return res.status(400).json({ error: 'feedback must be "helpful", "not_helpful", or null' });
  }

  const { rows } = await pool.query(
    `UPDATE chat_messages SET feedback = $1 WHERE id = $2 AND user_id = $3 RETURNING id, feedback`,
    [feedback, messageId, req.user.id],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'chat message not found' });
  }

  res.json(rows[0]);
}

export async function remedial(req, res) {
  const { chapterId } = req.body;

  if (!chapterId) {
    return res.status(400).json({ error: 'chapterId is required' });
  }

  const cacheKey = remedialCacheKey(chapterId);
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

  try {
    const content = await getRemedialContent(chapter.transcript, { userId: req.user.id });
    await setCache(cacheKey, content);
    res.json(content);
  } catch (err) {
    console.error('AI remedial call failed, serving fallback:', err.message);
    res.json(getRemedialFallback());
  }
}

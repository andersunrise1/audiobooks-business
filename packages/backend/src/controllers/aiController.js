import { explainTechnicalTerm, chatReply, buildChatContext } from '../services/aiService.js';
import { pool } from '../config/database.js';

export async function explainWord(req, res) {
  const { word, context } = req.body;

  if (!word || !context) {
    return res.status(400).json({ error: 'word and context are required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res
      .status(503)
      .json({ error: 'AI service is not configured (missing ANTHROPIC_API_KEY)' });
  }

  const explanation = await explainTechnicalTerm(word, context);
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

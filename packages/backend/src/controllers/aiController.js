import { explainTechnicalTerm, chatReply } from '../services/aiService.js';

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
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res
      .status(503)
      .json({ error: 'AI service is not configured (missing ANTHROPIC_API_KEY)' });
  }

  const reply = await chatReply(messages);
  res.json({ reply });
}

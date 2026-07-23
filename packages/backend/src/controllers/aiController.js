import { explainTechnicalTerm } from '../services/aiService.js';

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

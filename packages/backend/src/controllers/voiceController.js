import { parseVoiceCommand } from '../services/voiceCommandService.js';
import { explainTechnicalTerm } from '../services/aiService.js';
import { getUserStats } from '../services/statsService.js';
import { checkRateLimit, rateLimitExceededMessage } from '../services/rateLimitService.js';
import { getExplainFallback } from '../services/aiFallbackService.js';

export async function handleVoiceCommand(req, res) {
  const { transcript, context } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: 'transcript is required' });
  }

  const parsed = parseVoiceCommand(transcript);

  if (parsed.intent === 'explain') {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res
        .status(503)
        .json({ error: 'AI service is not configured (missing ANTHROPIC_API_KEY)' });
    }

    const limit = Number(process.env.AI_DAILY_RATE_LIMIT) || 50;
    const { allowed } = await checkRateLimit(req.user.id, limit);
    if (!allowed) {
      return res.status(429).json({ error: rateLimitExceededMessage(limit) });
    }

    try {
      const explanation = await explainTechnicalTerm(
        parsed.word,
        context || 'a general technical conversation',
        { userId: req.user.id, endpoint: 'voice_explain' },
      );
      return res.json({ intent: 'explain', word: parsed.word, explanation });
    } catch (err) {
      console.error('AI voice explain call failed, serving fallback:', err.message);
      return res.json({ intent: 'explain', ...(await getExplainFallback(parsed.word)) });
    }
  }

  if (parsed.intent === 'next_chapter') {
    return res.json({ intent: 'next_chapter' });
  }

  if (parsed.intent === 'progress') {
    const stats = await getUserStats(req.user.id);
    return res.json({ intent: 'progress', stats });
  }

  return res.json({ intent: 'unknown', transcript });
}

import { parseVoiceCommand } from '../services/voiceCommandService.js';
import { explainTechnicalTerm } from '../services/aiService.js';
import { getUserStats } from '../services/statsService.js';

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

    const explanation = await explainTechnicalTerm(
      parsed.word,
      context || 'a general technical conversation',
    );
    return res.json({ intent: 'explain', word: parsed.word, explanation });
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

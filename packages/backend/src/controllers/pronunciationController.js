import { transcribeAudio } from '../services/deepgramService.js';
import { scorePronunciation } from '../services/pronunciationScoreService.js';

export async function scoreRecording(req, res) {
  const { targetSentence } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'audio file is required' });
  }

  if (!targetSentence) {
    return res.status(400).json({ error: 'targetSentence is required' });
  }

  if (!process.env.DEEPGRAM_API_KEY) {
    return res
      .status(503)
      .json({ error: 'Pronunciation service is not configured (missing DEEPGRAM_API_KEY)' });
  }

  const transcript = await transcribeAudio(req.file.buffer, req.file.mimetype);
  const { score, matchedWords, unmatchedWords } = scorePronunciation(targetSentence, transcript);

  res.json({ transcript, score, matchedWords, unmatchedWords });
}

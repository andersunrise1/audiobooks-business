import { lookupWord } from '../services/technicalDictionaryService.js';

export async function getDictionaryEntry(req, res) {
  const entry = await lookupWord(req.params.word);

  if (!entry) {
    return res.status(404).json({ error: 'word not found in technical dictionary' });
  }

  res.json(entry);
}

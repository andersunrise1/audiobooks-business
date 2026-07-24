import { findRepeatedDifficultWords } from '../services/wordRepetitionService.js';

export async function getRepeatedDifficultWords(req, res) {
  const { chapterId } = req.params;
  const words = await findRepeatedDifficultWords(req.user.id, chapterId);
  res.json(words);
}

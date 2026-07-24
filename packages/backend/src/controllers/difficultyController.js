import {
  getStruggledWords,
  getLowCompletionChapters,
  getFrequentQuestionChapters,
} from '../services/difficultyService.js';

export async function getDifficultyProfile(req, res) {
  const userId = req.user.id;

  const [struggledWords, lowCompletionChapters, frequentQuestionChapters] = await Promise.all([
    getStruggledWords(userId),
    getLowCompletionChapters(),
    getFrequentQuestionChapters(userId),
  ]);

  res.json({ struggledWords, lowCompletionChapters, frequentQuestionChapters });
}

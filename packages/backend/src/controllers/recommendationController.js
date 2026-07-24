import {
  getNextChapterRecommendation,
  getRecommendedAudiobook,
  getBestStudyHour,
} from '../services/recommendationService.js';

export async function getRecommendations(req, res) {
  const userId = req.user.id;

  const [nextChapter, recommendedAudiobook, bestStudyHour] = await Promise.all([
    getNextChapterRecommendation(userId),
    getRecommendedAudiobook(userId),
    getBestStudyHour(userId),
  ]);

  res.json({ nextChapter, recommendedAudiobook, bestStudyHour });
}

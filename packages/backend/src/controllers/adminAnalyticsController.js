import {
  getQuestionsPerChapter,
  getAvgResponseTimeByEndpoint,
  getSatisfactionRate,
  getCostPerUser,
} from '../services/analyticsService.js';

export async function getAiAnalytics(req, res) {
  const [questionsPerChapter, avgResponseTime, satisfaction, costPerUser] = await Promise.all([
    getQuestionsPerChapter(),
    getAvgResponseTimeByEndpoint(),
    getSatisfactionRate(),
    getCostPerUser(),
  ]);

  res.json({ questionsPerChapter, avgResponseTime, satisfaction, costPerUser });
}

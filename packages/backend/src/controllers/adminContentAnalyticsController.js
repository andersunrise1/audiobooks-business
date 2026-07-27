import {
  getAudiobookCompletionRates,
  getUserRetention,
  getLifetimeValue,
} from '../services/contentAnalyticsService.js';

export async function getContentAnalytics(req, res) {
  const [completionRates, retention, lifetimeValue] = await Promise.all([
    getAudiobookCompletionRates(),
    getUserRetention(),
    getLifetimeValue(),
  ]);

  res.json({ completionRates, retention, lifetimeValue });
}

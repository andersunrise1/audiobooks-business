import { getUserStats as computeUserStats } from '../services/statsService.js';

export async function getUserStats(req, res) {
  const stats = await computeUserStats(req.user.id);
  res.json(stats);
}

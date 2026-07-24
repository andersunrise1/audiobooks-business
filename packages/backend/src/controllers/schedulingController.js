import { getStudyPriority } from '../services/schedulingService.js';

export async function getStudyPriorityQueue(req, res) {
  const queue = await getStudyPriority(req.user.id);
  res.json(queue);
}

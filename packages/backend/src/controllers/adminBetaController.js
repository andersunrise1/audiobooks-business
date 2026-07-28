import { setBetaTesterStatus, listFeedback } from '../services/betaProgramService.js';

export async function updateBetaTesterStatus(req, res) {
  const { id } = req.params;
  const { isBetaTester } = req.body;

  if (typeof isBetaTester !== 'boolean') {
    return res.status(400).json({ error: 'isBetaTester must be a boolean' });
  }

  const user = await setBetaTesterStatus(id, isBetaTester);

  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }

  res.json(user);
}

export async function getFeedback(req, res) {
  const feedback = await listFeedback();
  res.json(feedback);
}

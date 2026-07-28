import {
  submitFeedback,
  isValidFeedbackCategory,
  isValidRating,
} from '../services/betaProgramService.js';

export async function postFeedback(req, res) {
  const { category, rating, message } = req.body;

  if (!isValidFeedbackCategory(category)) {
    return res
      .status(400)
      .json({ error: 'category must be one of: bug, feature_request, general' });
  }

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  if (!isValidRating(rating)) {
    return res.status(400).json({ error: 'rating must be an integer from 1 to 5' });
  }

  const feedback = await submitFeedback(req.user.id, { category, rating, message });

  res.status(201).json({
    id: feedback.id,
    category: feedback.category,
    rating: feedback.rating,
    message: feedback.message,
    createdAt: feedback.created_at,
  });
}

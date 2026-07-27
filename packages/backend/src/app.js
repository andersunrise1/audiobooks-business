import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/authRoutes.js';
import audiobookRoutes from './routes/audiobookRoutes.js';
import userRoutes from './routes/userRoutes.js';
import dictionaryRoutes from './routes/dictionaryRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import experimentRoutes from './routes/experimentRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import { handleStripeWebhook } from './controllers/paymentController.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(cors({ exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'] }));

  // Stripe webhook signature verification needs the raw request body, so
  // this route is registered (with express.raw()) before the global JSON
  // parser below - every other route still gets normal JSON parsing.
  app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/audiobooks', audiobookRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/dictionary', dictionaryRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/voice', voiceRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/payment', paymentRoutes);
  app.use('/api/experiments', experimentRoutes);
  app.use('/api/support', supportRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

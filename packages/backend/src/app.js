import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import betaRoutes from './routes/betaRoutes.js';
import { handleStripeWebhook } from './controllers/paymentController.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { enforceHttps } from './middleware/security.js';
import { generalRateLimit, authRateLimit } from './middleware/generalRateLimit.js';

// Dia 75: restricted to the real frontend origin (already used for Stripe
// redirect URLs) instead of the previous wide-open default. Requests with
// no Origin header (curl, server-to-server, the desktop app's main
// process) are allowed through - CORS is a browser-enforced mechanism, so
// restricting it doesn't meaningfully constrain non-browser clients either
// way; it protects this app's actual web users from other sites silently
// making credentialed cross-origin requests.
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

function corsOrigin(origin, callback) {
  if (!origin || origin === allowedOrigin) return callback(null, true);
  return callback(new Error('Not allowed by CORS'));
}

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(enforceHttps);
  app.use(
    cors({ origin: corsOrigin, exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'] }),
  );

  // Stripe webhook signature verification needs the raw request body, so
  // this route is registered (with express.raw()) before the global JSON
  // parser below - every other route still gets normal JSON parsing.
  app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

  app.use(express.json());
  app.use('/api', generalRateLimit);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRateLimit, authRoutes);
  app.use('/api/audiobooks', audiobookRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/dictionary', dictionaryRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/voice', voiceRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/payment', paymentRoutes);
  app.use('/api/experiments', experimentRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/beta', betaRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

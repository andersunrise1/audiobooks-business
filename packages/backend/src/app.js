import path from 'path';
import { fileURLToPath } from 'url';
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

// Dia 75: restricted to the real frontend origin(s) (already used for
// Stripe redirect URLs) instead of the previous wide-open default. FRONTEND_URL
// accepts a comma-separated list so a second legitimate origin (e.g. a LAN
// address used to test the dev server from a phone) can be added without
// loosening this back to wide-open. Requests with no Origin header (curl,
// server-to-server, the desktop app's main process) are allowed through -
// CORS is a browser-enforced mechanism, so restricting it doesn't
// meaningfully constrain non-browser clients either way; it protects this
// app's actual web users from other sites silently making credentialed
// cross-origin requests.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function corsOrigin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Not allowed by CORS'));
}

export function createApp() {
  const app = express();

  // Railway (like Heroku/Render) terminates TLS at its own edge and forwards
  // plain HTTP internally, so req.protocol is always 'http' unless Express
  // is told to trust the X-Forwarded-Proto header from that one hop. Without
  // this, resolveLocalMediaUrl (audiobookController.js) built cover/audio
  // URLs as http://, which native apps refuse to load at all (Android
  // blocks cleartext traffic by default) - real users saw missing covers
  // and a play button that silently failed. `1` trusts exactly one proxy
  // hop, matching Railway's own topology (not a wildcard trust-everyone
  // setting, which would let a client spoof its own X-Forwarded-* headers).
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(enforceHttps);
  app.use(
    cors({ origin: corsOrigin, exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'] }),
  );

  // Stripe webhook signature verification needs the raw request body, so
  // this route is registered (with express.raw()) before the global JSON
  // parser below - every other route still gets normal JSON parsing.
  app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

  // Serves locally-generated narration audio (scripts/generateNarration.js).
  // helmet() defaults Cross-Origin-Resource-Policy to 'same-origin', which
  // would otherwise block the frontend (a different origin/port in dev)
  // from loading these files in an <audio> tag - overridden here for just
  // this static route rather than weakening it globally.
  app.use(
    '/audio',
    express.static(path.join(__dirname, '../public/audio'), {
      setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
    }),
  );

  // Serves locally-generated audiobook cover illustrations (same pattern as
  // /audio above, same CORP override reasoning).
  app.use(
    '/covers',
    express.static(path.join(__dirname, '../public/covers'), {
      setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
    }),
  );

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

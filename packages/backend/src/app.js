import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/authRoutes.js';
import audiobookRoutes from './routes/audiobookRoutes.js';
import userRoutes from './routes/userRoutes.js';
import dictionaryRoutes from './routes/dictionaryRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import pronunciationRoutes from './routes/pronunciationRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/audiobooks', audiobookRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/dictionary', dictionaryRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/pronunciation', pronunciationRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

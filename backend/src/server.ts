import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';

import recommendationRoutes from './routes/recommendation.routes';
import wishlistRoutes from './routes/wishlist.routes';
import steamRoutes from './routes/steam.routes';
import authRoutes from './routes/auth.routes';
import multiplatformRoutes from './routes/multiplatform.routes';
import retroAchievementsRoutes from './routes/retroachievements.routes';
import pcsx2Routes from './routes/pcsx2.routes';
import rpcs3Routes from './routes/rpcs3.routes';
import ppssppRoutes from './routes/ppsspp.routes';
import sessionsRoutes from './routes/sessions.routes';
import journalRoutes from './routes/journal.routes';
import userRoutes from './routes/user.routes';
import hltbRoutes from './routes/hltb.routes';
import retroArchRoutes from './routes/retroarch.routes';

const app: Express = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: isProd
    ? true
    : process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Steam Tracker API is running!',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/steam', steamRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/multiplatform', multiplatformRoutes);
app.use('/api/retroachievements', retroAchievementsRoutes);
app.use('/api/pcsx2', pcsx2Routes);
app.use('/api/rpcs3', rpcs3Routes);
app.use('/api/ppsspp', ppssppRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/user', userRoutes);
app.use('/api/hltb', hltbRoutes);
app.use('/api/retroarch', retroArchRoutes);

if (isProd) {
  const frontendPath = path.join(__dirname, '../../frontend');
  app.use(express.static(frontendPath));

  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Steam API: http://localhost:${PORT}/api/steam`);
  console.log(`Auth: http://localhost:${PORT}/api/auth`);
  console.log(`RetroAchievements: http://localhost:${PORT}/api/retroachievements`);
  console.log(`PCSX2: http://localhost:${PORT}/api/pcsx2`);
  console.log(`RPCS3: http://localhost:${PORT}/api/rpcs3`);
  console.log(`Journal: http://localhost:${PORT}/api/journal`);
  console.log(`HLTB: http://localhost:${PORT}/api/hltb`);
  console.log(`RetroArch: http://localhost:${PORT}/api/retroarch`);

  if (isProd) {
    console.log('Frontend served from Express (production mode)');
  }
});

export default app;
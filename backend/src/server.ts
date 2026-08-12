import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';

import { apiLimiter, authLimiter, expensiveOpLimiter } from './middleware/rateLimit.middleware';

import recommendationRoutes from './routes/recommendation.routes';
import wishlistRoutes from './routes/wishlist.routes';
import steamRoutes from './routes/steam.routes';
import authRoutes from './routes/auth.routes';
import sessionsRoutes from './routes/sessions.routes';
import journalRoutes from './routes/journal.routes';
import userRoutes from './routes/user.routes';
import hltbRoutes from './routes/hltb.routes';
import cronRoutes from './routes/cron.routes';
import predictionsRoutes from './routes/predictions.routes';

const app: Express = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// Behind a hosting provider's reverse proxy, req.ip is the proxy unless we
// trust the first hop. Without this every visitor shares one rate-limit
// bucket. Trust exactly one hop — trusting all of them lets clients spoof
// X-Forwarded-For and evade the limiter entirely.
if (isProd) {
	app.set('trust proxy', 1);
}

const getCorsOrigin = () => {
	if (isProd) {
		const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
		if (allowedOrigins.length === 0) {
			throw new Error('CRITICAL: CORS_ALLOWED_ORIGINS environment variable is not set for production. Please set comma-separated allowed origins.');
		}
		return allowedOrigins;
	}
	return process.env.CORS_ORIGIN || 'http://localhost:5173';
};

app.use(cors({
	origin: getCorsOrigin(),
	credentials: true
}));

app.use(express.json());

app.use('/api/', apiLimiter);

app.get('/health', (_req: Request, res: Response) => {
	res.json({
		status: 'ok',
		message: 'Steam Tracker API is running!',
		timestamp: new Date().toISOString()
	});
});

app.use('/api/auth', authLimiter);
app.use('/api/auth', authRoutes);

app.use('/api/recommendations', expensiveOpLimiter);
app.use('/api/recommendations', recommendationRoutes);

app.use('/api/steam', steamRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/user', userRoutes);
app.use('/api/hltb', hltbRoutes);
app.use('/api/predictions', expensiveOpLimiter);
app.use('/api/predictions', predictionsRoutes);

app.use('/api/cron', cronRoutes);

if (isProd) {
	// __dirname is backend/dist at runtime, so this resolves to the Vite build
	// output. Pointing at frontend/ instead serves the dev index.html, whose
	// <script src="/src/main.tsx"> the browser cannot execute.
	const frontendPath = path.join(__dirname, '../../frontend/dist');
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
	console.log(`Journal: http://localhost:${PORT}/api/journal`);
	console.log(`HLTB: http://localhost:${PORT}/api/hltb`);

	if (isProd) {
		console.log('Frontend served from Express (production mode)');
	}
});

export default app;
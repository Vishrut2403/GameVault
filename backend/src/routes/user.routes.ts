import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { sessionTrackingService } from '../services/session-tracking.service';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

router.get('/profile', async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user?.userId;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				username: true,
				displayName: true,
				avatar: true,
				xp: true,
				level: true,
				steamId: true,
				steamUsername: true,
				steamAvatar: true,
				steamLinkedAt: true,
				createdAt: true,
				lastLoginAt: true,
			}
		});

		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		res.json({ user });
	} catch (error) {
		console.error('Error fetching profile:', error);
		res.status(500).json({ error: 'Failed to fetch profile' });
	}
});

router.put('/profile', async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user?.userId;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const { 
			username, 
			displayName, 
			avatar
		} = req.body;

		const user = await prisma.user.update({
			where: { id: userId },
			data: {
				...(username && { username }),
				...(displayName !== undefined && { displayName }),
				...(avatar !== undefined && { avatar }),
			},
			select: {
				id: true,
				email: true,
				username: true,
				displayName: true,
				avatar: true,
				xp: true,
				level: true,
				createdAt: true,
			}
		});

		res.json({ user });
	} catch (error) {
		console.error('Error updating profile:', error);
		res.status(500).json({ error: 'Failed to update profile' });
	}
});

router.get('/library', async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user?.userId;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const games = await prisma.libraryGame.findMany({
			where: { userId, platform: 'steam' },
			orderBy: { updatedAt: 'desc' }
		});

		res.json({ games });
	} catch (error) {
		console.error('Error fetching library:', error);
		res.status(500).json({ error: 'Failed to fetch library' });
	}
});

router.get('/sessions', async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user?.userId;
		
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const { startDate, endDate, gameId, platform } = req.query;

		const options: any = {};
		if (startDate) options.startDate = new Date(startDate as string);
		if (endDate) options.endDate = new Date(endDate as string);
		if (gameId) options.gameId = gameId as string;
		if (platform) options.platform = platform as string;

		const sessions = await sessionTrackingService.getUserSessions(userId, options);
		
		res.json({ sessions });
	} catch (error) {
		console.error('❌ Error fetching sessions:', error);
		res.status(500).json({ error: 'Failed to fetch sessions' });
	}
});

router.get('/activity', async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user?.userId;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const days = req.query.days ? parseInt(req.query.days as string) : 365;
		const activity = await sessionTrackingService.getDailyActivity(userId, days);

		res.json({ activity });
	} catch (error) {
		console.error('Error fetching activity:', error);
		res.status(500).json({ error: 'Failed to fetch activity' });
	}
});

router.post('/disconnect-steam', async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user?.userId;

		if (!userId) {
			return res.status(401).json({ success: false, error: 'Unauthorized' });
		}

		await prisma.user.update({
			where: { id: userId },
			data: {
				steamId: null,
				steamUsername: null,
				steamAvatar: null,
				steamLinkedAt: null
			}
		});

		res.json({ success: true });
	} catch (error: any) {
		console.error('Error disconnecting Steam:', error);
		res.status(500).json({ success: false, error: 'Failed to disconnect' });
	}
});

export default router;
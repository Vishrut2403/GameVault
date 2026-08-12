import { Router, Request, Response } from 'express';
import { sessionTrackingService } from '../services/session-tracking.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/daily-activity', async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user?.userId;
		const { days } = req.query;

		if (!userId) {
			res.status(400).json({
				success: false,
				error: 'Unauthorized'
			});
			return;
		}

		const daysNum = days ? parseInt(days as string) : 365;
		const activity = await sessionTrackingService.getDailyActivity(
			userId,
			daysNum
		);

		res.json({
			success: true,
			data: activity
		});
	} catch (error: any) {
		console.error('Error fetching daily activity:', error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to fetch daily activity'
		});
	}
});

router.get('/', async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user?.userId;
		const { startDate, endDate, gameId, platform } = req.query;

		if (!userId) {
			res.status(400).json({
				success: false,
				error: 'Unauthorized'
			});
			return;
		}

		const options: any = {};
		if (startDate) options.startDate = new Date(startDate as string);
		if (endDate) options.endDate = new Date(endDate as string);
		if (gameId) options.gameId = gameId as string;
		if (platform) options.platform = platform as string;

		const sessions = await sessionTrackingService.getUserSessions(
			userId,
			options
		);

		res.json({
			success: true,
			data: sessions
		});
	} catch (error: any) {
		console.error('Error fetching sessions:', error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to fetch sessions'
		});
	}
});

router.get('/total-playtime', async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user?.userId;
		const { startDate, endDate } = req.query;

		if (!userId || !startDate || !endDate) {
			res.status(400).json({
				success: false,
				error: 'startDate and endDate are required'
			});
			return;
		}

		const totalMinutes = await sessionTrackingService.getTotalPlaytime(
			userId,
			new Date(startDate as string),
			new Date(endDate as string)
		);

		res.json({
			success: true,
			data: {
				minutes: totalMinutes,
				hours: totalMinutes / 60
			}
		});
	} catch (error: any) {
		console.error('Error fetching total playtime:', error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to fetch total playtime'
		});
	}
});

export default router;
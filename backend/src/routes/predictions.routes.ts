import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../prisma';
import { CompletionPredictionService } from '../services/completion-prediction.service';

const router = Router();
router.use(authMiddleware);

const predictionService = new CompletionPredictionService(prisma);

router.post('/:gameId', async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user?.userId;
		if (!userId) {
			return res.status(401).json({ success: false, error: 'Unauthorized' });
		}

		const gameId = Array.isArray(req.params.gameId) ? req.params.gameId[0] : req.params.gameId;
		const hltbCompletionistMinutes = req.query.hltbCompletionistMinutes
			? parseInt(req.query.hltbCompletionistMinutes as string) * 60
			: undefined;

		const prediction = await predictionService.predictCompletion(
			userId,
			gameId,
			hltbCompletionistMinutes,
		);

		return res.json({
			success: true,
			data: prediction,
		});
	} catch (error: any) {
		console.error('[Predictions] Error calculating prediction:', error);
		return res.status(500).json({
			success: false,
			error: error.message || 'Failed to calculate prediction',
		});
	}
});

router.get('/playstyle/current', async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user?.userId;
		if (!userId) {
			return res.status(401).json({ success: false, error: 'Unauthorized' });
		}

		const playstyle = await predictionService.getUserPlaystyle(userId);

		return res.json({
			success: true,
			data: playstyle,
		});
	} catch (error: any) {
		console.error('[Predictions] Error getting playstyle:', error);
		return res.status(500).json({
			success: false,
			error: error.message || 'Failed to get playstyle',
		});
	}
});

router.get('/accuracy/metrics', async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user?.userId;
		if (!userId) {
			return res.status(401).json({ success: false, error: 'Unauthorized' });
		}

		const accuracy = await predictionService.getPredictionAccuracy(userId);

		return res.json({
			success: true,
			data: accuracy,
		});
	} catch (error: any) {
		console.error('[Predictions] Error getting accuracy:', error);
		return res.status(500).json({
			success: false,
			error: error.message || 'Failed to get accuracy metrics',
		});
	}
});

export default router;

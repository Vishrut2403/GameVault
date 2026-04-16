import { Router, Request, Response } from 'express';
import { autoSyncService } from '../services/auto-sync.service';
import { authMiddleware } from '../middleware/auth.middleware';

interface AuthRequest extends Request {
  user?: {
	userId: string;
	username: string;
  };
}

const router = Router();

router.post('/trigger', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
	const userId = req.user?.userId;
	
	if (!userId) {
	  res.status(401).json({
		success: false,
		error: 'User not authenticated'
	  });
	  return;
	}

	autoSyncService.triggerAutoSync(userId).catch(err => {
	  console.error('Auto-sync error:', err);
	});

	res.json({
	  success: true,
	  message: 'Auto-sync triggered successfully'
	});
  } catch (error: any) {
	console.error('Error triggering auto-sync:', error);
	res.status(500).json({
	  success: false,
	  error: error.message || 'Failed to trigger auto-sync'
	});
  }
});

router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
	const userId = req.user?.userId;
	
	if (!userId) {
	  res.status(401).json({
		success: false,
		error: 'User not authenticated'
	  });
	  return;
	}

	const lastSyncTime = autoSyncService.getLastSyncTime(userId);

	res.json({
	  success: true,
	  data: {
		lastSyncTime,
		cooldownMs: 30000
	  }
	});
  } catch (error: any) {
	console.error('Error getting auto-sync status:', error);
	res.status(500).json({
	  success: false,
	  error: error.message || 'Failed to get auto-sync status'
	});
  }
});

export default router;

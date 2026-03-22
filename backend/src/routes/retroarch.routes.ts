import { Router, Response } from 'express';
import retroArchService from '../services/retroarch.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

// Preview detected games without syncing to DB
router.get('/instances', async (req: AuthRequest, res: Response) => {
  try {
    const instances = await retroArchService.getInstances();
    res.json({ success: true, count: instances.length, data: instances });
  } catch (error: any) {
    console.error('[RetroArch] Error fetching instances:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch RetroArch instances' });
  }
});

// Sync all detected games into the library
router.post('/sync', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const result = await retroArchService.syncLibrary(userId);
    res.json({
      success: true,
      message: `Synced ${result.synced} new games, updated ${result.updated} existing`,
      ...result,
    });
  } catch (error: any) {
    console.error('[RetroArch] Error syncing library:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to sync RetroArch library' });
  }
});

export default router;
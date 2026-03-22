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
        raUsername: true,
        raApiKey: true,
        raLinkedAt: true,
        enablePCSX2: true,
        enableRPCS3: true,
        enablePPSSPP: true,
        enableRetroArch: true,
        autoSyncSteam: true,
        autoSyncRA: true,
        autoSyncEmulators: true,
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
      avatar,
      autoSyncSteam,
      autoSyncRA,
      autoSyncEmulators
    } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(displayName !== undefined && { displayName }),
        ...(avatar !== undefined && { avatar }),
        ...(autoSyncSteam !== undefined && { autoSyncSteam }),
        ...(autoSyncRA !== undefined && { autoSyncRA }),
        ...(autoSyncEmulators !== undefined && { autoSyncEmulators }),
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
      where: { userId },
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

router.post('/connect-ra', async (req: AuthRequest, res: Response) => {
  try {
    const { raUsername, raApiKey } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!raUsername || !raApiKey) {
      return res.status(400).json({ success: false, error: 'Username and API key required' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        raUsername,
        raApiKey,
        raLinkedAt: new Date()
      }
    });

    try {
      await fetch(`http://localhost:3001/api/retroachievements/sync-library`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, raUsername, raApiKey })
      });
    } catch (syncError) {
      console.error('RA sync failed (connection still saved):', syncError);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error connecting RA:', error);
    res.status(500).json({ success: false, error: 'Failed to connect' });
  }
});

router.post('/disconnect-ra', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        raUsername: null,
        raApiKey: null,
        raLinkedAt: null
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error disconnecting RA:', error);
    res.status(500).json({ success: false, error: 'Failed to disconnect' });
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

router.post('/toggle-emulator', async (req: AuthRequest, res: Response) => {
  try {
    const { emulator, enabled } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const fieldMap: Record<string, string> = {
      'PCSX2':      'enablePCSX2',
      'RPCS3':      'enableRPCS3',
      'PPSSPP':     'enablePPSSPP',
      'RetroArch':  'enableRetroArch',
    };

    const field = fieldMap[emulator];
    if (!field) {
      return res.status(400).json({ success: false, error: 'Invalid emulator' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { [field]: enabled }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error toggling emulator:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle' });
  }
});

export default router;
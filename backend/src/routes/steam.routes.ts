import { Router, Request, Response } from 'express';
import steamService from '../services/steam.service';
import prisma from '../prisma';
import { sessionTrackingService } from '../services/session-tracking.service';

const router = Router();

router.get('/library/:steamId', async (req: Request, res: Response) => {
  try {
    const steamId = req.params.steamId as string;

    if (!steamId) {
      res.status(400).json({ error: 'Steam ID is required' });
      return;
    }

    const library = await steamService.getUserLibrary(steamId);
    
    const user = await prisma.user.findUnique({ where: { steamId } });
    
    if (user) {
      for (const steamGame of library) {
        try {
          const existingGame = await prisma.libraryGame.findUnique({
            where: {
              userId_platformGameId_platform: {
                userId: user.id,
                platformGameId: String(steamGame.appid),
                platform: 'steam'
              }
            }
          });

          const newPlaytime = steamGame.playtime_forever || 0;

          if (existingGame && newPlaytime > 0) {
            const oldPlaytime = existingGame.playtimeForever || 0;
            
            if (newPlaytime > oldPlaytime) {
              const delta = newPlaytime - oldPlaytime;
              
              const sessionDate = (steamGame as any).rtime_last_played 
                ? new Date((steamGame as any).rtime_last_played * 1000) 
                : undefined;
              
              await sessionTrackingService.trackSession({
                userId: user.id,
                gameId: existingGame.id,
                platform: 'steam',
                newPlaytimeMinutes: newPlaytime,
                oldPlaytimeMinutes: oldPlaytime,
                sessionDate
              });
            }
          }
        } catch (error) {
          console.error(`Failed to track session for ${steamGame.name}:`, error);
        }
      }
    }

    await steamService.saveLibrary(steamId, library);

    res.json({
      success: true,
      count: library.length,
      games: library
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch Steam library',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/library/:steamId/enriched', async (req: Request, res: Response) => {
  try {
    const steamId = req.params.steamId as string;
    const platform = req.query.platform as string | undefined;

    if (!steamId) {
      res.status(400).json({ error: 'Steam ID is required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { steamId },
      include: {
        games: {
          where: platform ? { platform } : undefined,
          orderBy: [
            { status: 'asc' },
            { playtimeForever: 'desc' }
          ]
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found. Fetch library first.' });
      return;
    }

    res.json({
      success: true,
      userId: user.id,
      count: user.games.length,
      games: user.games,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch enriched library',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/library/:steamId/platforms', async (req: Request, res: Response) => {
  try {
    const steamId = req.params.steamId as string;

    if (!steamId) {
      res.status(400).json({ error: 'Steam ID is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { steamId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const platforms = await prisma.libraryGame.groupBy({
      by: ['platform'],
      where: { userId: user.id },
      _count: true,
    });

    res.json({
      success: true,
      platforms: platforms.map(p => ({
        platform: p.platform,
        count: p._count,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch platforms',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.patch('/library/:steamId/game/:appId/price', async (req: Request, res: Response) => {
  try {
    const steamId = req.params.steamId as string;
    const appId = req.params.appId as string;
    const { pricePaid } = req.body;

    if (!steamId || !appId) {
      res.status(400).json({ error: 'Steam ID and App ID are required' });
      return;
    }

    if (typeof pricePaid !== 'number' || pricePaid < 0) {
      res.status(400).json({ error: 'Valid price is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { steamId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const game = await prisma.libraryGame.findUnique({
      where: { 
        userId_platformGameId_platform: { 
          userId: user.id, 
          platformGameId: String(appId),
          platform: 'steam'
        } 
      },
    });

    if (!game) {
      res.status(404).json({ error: 'Game not found in library' });
      return;
    }

    const hours = (game.playtimeForever || 0) / 60;
    const pricePerHour = hours > 0 ? pricePaid / hours : 0;

    const updated = await prisma.libraryGame.update({
      where: { 
        userId_platformGameId_platform: { 
          userId: user.id, 
          platformGameId: String(appId),
          platform: 'steam'
        } 
      },
      data: { pricePaid, pricePerHour },
    });

    res.json({ success: true, game: updated });
  } catch (error) {
    console.error('Error updating price:', error);
    res.status(500).json({
      error: 'Failed to update price',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.patch('/library/:steamId/game/:appId/status', async (req: Request, res: Response) => {
  try {
    const steamId = req.params.steamId as string;
    const appId = req.params.appId as string;
    const { status } = req.body;

    if (!steamId || !appId) {
      res.status(400).json({ error: 'Steam ID and App ID are required' });
      return;
    }

    const validStatuses = ['playing', 'completed', 'backlog', 'unplayed'];
    if (!validStatuses.includes(status)) {
      console.error('Invalid status:', status);
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const user = await prisma.user.findUnique({ where: { steamId } });
    if (!user) {
      console.error('User not found for steamId:', steamId);
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updateData: any = { status };

    const updated = await prisma.libraryGame.update({
      where: { 
        userId_platformGameId_platform: { 
          userId: user.id, 
          platformGameId: String(appId),
          platform: 'steam'
        } 
      },
      data: updateData,
    });

    res.json({ success: true, game: updated });
  } catch (error: any) {
    console.error('Error updating status:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Game not found in library' });
      return;
    }
    res.status(500).json({
      error: 'Failed to update status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.patch('/library/:steamId/game/:appId/rating', async (req: Request, res: Response) => {
  try {
    const steamId = req.params.steamId as string;
    const appId = req.params.appId as string;
    const { rating } = req.body;

    if (!steamId || !appId) {
      res.status(400).json({ error: 'Steam ID and App ID are required' });
      return;
    }

    if (rating !== null && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      res.status(400).json({ error: 'Rating must be between 1 and 5 or null' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { steamId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updated = await prisma.libraryGame.update({
      where: { 
        userId_platformGameId_platform: { 
          userId: user.id, 
          platformGameId: String(appId),
          platform: 'steam'
        } 
      },
      data: { rating },
    });

    res.json({ success: true, game: updated });
  } catch (error: any) {
    console.error('Error updating rating:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Game not found in library' });
      return;
    }
    res.status(500).json({
      error: 'Failed to update rating',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.patch('/library/:steamId/game/:appId/tags', async (req: Request, res: Response) => {
  try {
    const steamId = req.params.steamId as string;
    const appId = req.params.appId as string;
    const { tags } = req.body;

    if (!steamId || !appId) {
      res.status(400).json({ error: 'Steam ID and App ID are required' });
      return;
    }

    if (!Array.isArray(tags)) {
      res.status(400).json({ error: 'Tags must be an array' });
      return;
    }

    const validTags = tags.every(
      (tag: any) => 
        typeof tag === 'string' && 
        tag.length > 0 && 
        tag.length <= 20 &&
        /^[a-zA-Z0-9\s-]+$/.test(tag)
    );

    if (!validTags) {
      res.status(400).json({ error: 'Invalid tags format (alphanumeric, max 20 chars each)' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { steamId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updated = await prisma.libraryGame.update({
      where: { 
        userId_platformGameId_platform: { 
          userId: user.id, 
          platformGameId: String(appId),
          platform: 'steam'
        } 
      },
      data: { userTags: tags },
    });

    res.json({ success: true, game: updated });
  } catch (error: any) {
    console.error('Error updating tags:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Game not found in library' });
      return;
    }
    res.status(500).json({
      error: 'Failed to update tags',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.patch('/library/:steamId/game/:appId/review', async (req: Request, res: Response) => {
  try {
    const steamId = req.params.steamId as string;
    const appId = req.params.appId as string;
    const { review } = req.body;

    if (!steamId || !appId) {
      res.status(400).json({ error: 'Steam ID and App ID are required' });
      return;
    }

    if (review !== null && typeof review !== 'string') {
      res.status(400).json({ error: 'Review must be a string or null' });
      return;
    }

    if (review && review.length > 2000) {
      res.status(400).json({ error: 'Review too long (max 2000 characters)' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { steamId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updated = await prisma.libraryGame.update({
      where: { 
        userId_platformGameId_platform: { 
          userId: user.id, 
          platformGameId: String(appId),
          platform: 'steam'
        } 
      },
      data: { review: review || null },
    });

    res.json({ success: true, game: updated });
  } catch (error: any) {
    console.error('Error updating review:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Game not found in library' });
      return;
    }
    res.status(500).json({
      error: 'Failed to update review',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.patch('/library/:steamId/game/:appId/image', async (req: Request, res: Response) => {
  try {
    const steamId = req.params.steamId as string;
    const appId = req.params.appId as string;
    const { headerImage } = req.body;

    if (!steamId || !appId) {
      res.status(400).json({ error: 'Steam ID and App ID are required' });
      return;
    }

    if (!headerImage || typeof headerImage !== 'string') {
      res.status(400).json({ error: 'Valid image URL is required' });
      return;
    }

    if (!headerImage.startsWith('http://') && !headerImage.startsWith('https://')) {
      res.status(400).json({ error: 'Image URL must be a valid HTTP/HTTPS URL' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { steamId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updated = await prisma.libraryGame.update({
      where: { 
        userId_platformGameId_platform: { 
          userId: user.id, 
          platformGameId: String(appId),
          platform: 'steam'
        } 
      },
      data: { imageUrl: headerImage },
    });

    res.json({ success: true, game: updated });
  } catch (error: any) {
    console.error('Error updating image:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Game not found in library' });
      return;
    }
    res.status(500).json({
      error: 'Failed to update image',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/wishlist/:steamId', async (req: Request, res: Response) => {
  try {
    const steamId = req.params.steamId as string;

    if (!steamId) {
      res.status(400).json({ error: 'Steam ID is required' });
      return;
    }

    const wishlist = await steamService.getEnrichedWishlist(steamId);
    await steamService.saveWishlist(steamId, wishlist);

    res.json({
      success: true,
      count: wishlist.length,
      games: wishlist
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch wishlist',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/player/:steamId', async (req: Request, res: Response) => {
  try {
    const steamId = req.params.steamId as string;

    if (!steamId) {
      res.status(400).json({ error: 'Steam ID is required' });
      return;
    }

    const player = await steamService.getPlayerSummary(steamId);

    res.json({
      success: true,
      player
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch player information',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
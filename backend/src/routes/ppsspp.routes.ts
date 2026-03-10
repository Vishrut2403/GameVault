import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { PPSSPPService } from '../services/ppsspp.service';
import { sessionTrackingService } from '../services/session-tracking.service';

const router = Router();
const ppssppService = new PPSSPPService();

router.get('/games', async (req: Request, res: Response) => {
  try {
    const games = ppssppService.getAllGames();

    res.json({
      success: true,
      data: games
    });
  } catch (error: any) {
    console.error('Error reading PPSSPP games:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to read PPSSPP games'
    });
  }
});

router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required'
      });
      return;
    }

    const ppssppGames = ppssppService.getAllGames();

    if (ppssppGames.length === 0) {
      res.json({
        success: true,
        message: 'No PPSSPP games found',
        summary: {
          total: 0,
          linked: 0,
          notFound: 0
        }
      });
      return;
    }

    let linked = 0;
    let notFound = 0;

    const allPSPGames = await prisma.libraryGame.findMany({
      where: {
        userId,
        platform: 'retroachievements',
        platformData: {
          path: ['consoleId'],
          equals: 41
        }
      }
    });

    for (const ppssppGame of ppssppGames) {
      
      const normalizedPPSSPPName = ppssppGame.gameName.toLowerCase().replace(/[®™:]/g, '').trim();
      
      const matchedGame = allPSPGames.find(game => {
        const normalizedGameName = game.name.toLowerCase().replace(/[®™:]/g, '').trim();
        return normalizedGameName.includes(normalizedPPSSPPName) || 
               normalizedPPSSPPName.includes(normalizedGameName);
      });

      if (matchedGame) {
        const playtimeMinutes = Math.round(Number(ppssppGame.playtimeSeconds || 0) / 60);
        const oldPlaytime = matchedGame.playtimeForever || 0;

        if (playtimeMinutes > oldPlaytime) {
          const sessionDate = ppssppGame.lastPlayed ? new Date(Number(ppssppGame.lastPlayed || 0) * 1000) : undefined;
          await sessionTrackingService.trackSession({
            userId: matchedGame.userId,
            gameId: matchedGame.id,
            platform: matchedGame.platform,
            newPlaytimeMinutes: playtimeMinutes,
            oldPlaytimeMinutes: oldPlaytime,
            sessionDate
          });
        }
        
        await prisma.libraryGame.update({
          where: { id: matchedGame.id },
          data: {
            playtimeForever: playtimeMinutes,
            platformData: {
              ...(matchedGame.platformData as any),
              serial: ppssppGame.serial,
              lastPlayedPPSSPP: ppssppGame.lastPlayed,
              ppssppPlaytimeSeconds: Number(ppssppGame.playtimeSeconds || 0)
            }
          }
        });

        linked++;
      } else {
        notFound++;
      }
    }

    res.json({
      success: true,
      message: `Synced ${linked} PSP games`,
      summary: {
        total: ppssppGames.length,
        linked,
        notFound
      }
    });
  } catch (error: any) {
    console.error('❌ Error syncing PPSSPP:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync PPSSPP playtime'
    });
  }
});

router.post('/link-serials', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required'
      });
      return;
    }

    const ppssppGames = ppssppService.getAllGames();

    if (ppssppGames.length === 0) {
      res.json({
        success: true,
        summary: {
          total: 0,
          linked: 0,
          notFound: 0
        }
      });
      return;
    }

    let linked = 0;
    let notFound = 0;

    const allPSPGames = await prisma.libraryGame.findMany({
      where: {
        userId,
        platform: 'retroachievements',
        platformData: {
          path: ['consoleId'],
          equals: 41
        }
      }
    });

    for (const ppssppGame of ppssppGames) {

      const normalizedPPSSPPName = ppssppGame.gameName.toLowerCase().replace(/[®™:]/g, '').trim();
      
      const matchedGame = allPSPGames.find(game => {
        const normalizedGameName = game.name.toLowerCase().replace(/[®™:]/g, '').trim();
        return normalizedGameName.includes(normalizedPPSSPPName) || 
               normalizedPPSSPPName.includes(normalizedGameName);
      });

      if (matchedGame) {
        const playtimeMinutes = Math.round(Number(ppssppGame.playtimeSeconds || 0) / 60);
        const oldPlaytime = matchedGame.playtimeForever || 0;
        
        if (playtimeMinutes > oldPlaytime) {
          const sessionDate = ppssppGame.lastPlayed ? new Date(Number(ppssppGame.lastPlayed || 0) * 1000) : undefined;
          await sessionTrackingService.trackSession({
            userId: matchedGame.userId,
            gameId: matchedGame.id,
            platform: matchedGame.platform,
            newPlaytimeMinutes: playtimeMinutes,
            oldPlaytimeMinutes: oldPlaytime,
            sessionDate
          });
        }
        
        await prisma.libraryGame.update({
          where: { id: matchedGame.id },
          data: {
            playtimeForever: playtimeMinutes,
            platformData: {
              ...(matchedGame.platformData as any),
              serial: ppssppGame.serial,
              lastPlayedPPSSPP: ppssppGame.lastPlayed,
              ppssppPlaytimeSeconds: Number(ppssppGame.playtimeSeconds || 0)
            }
          }
        });

        linked++;
      } else {
        notFound++;
      }
    }

    res.json({
      success: true,
      summary: {
        total: ppssppGames.length,
        linked,
        notFound
      }
    });
  } catch (error: any) {
    console.error('❌ Error linking PPSSPP serials:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to link PPSSPP serials'
    });
  }
});

export default router;
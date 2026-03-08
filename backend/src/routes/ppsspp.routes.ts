import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { PPSSPPService } from '../services/ppsspp.service';

const router = Router();
const ppssppService = new PPSSPPService();

// GET /api/ppsspp/games - Get all PPSSPP games  
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

// POST /api/ppsspp/link-serials - Link PPSSPP serials to RA games
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
        const playtimeMinutes = Math.round(ppssppGame.playtimeSeconds / 60);

        await prisma.libraryGame.update({
          where: { id: matchedGame.id },
          data: {
            playtimeForever: playtimeMinutes,
            platformData: {
              ...(matchedGame.platformData as any),
              serial: ppssppGame.serial,
              lastPlayedPPSSPP: ppssppGame.lastPlayed,
              ppssppPlaytimeSeconds: ppssppGame.playtimeSeconds
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
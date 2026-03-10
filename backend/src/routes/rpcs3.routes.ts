import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { RPCS3Service } from '../services/rpcs3.service';
import { RPCS3TrophyService } from '../services/rpcs3-trophy.service';
import { sessionTrackingService } from '../services/session-tracking.service';

const router = Router();
const rpcs3Service = new RPCS3Service();
const trophyService = new RPCS3TrophyService();

router.get('/playtimes', async (req: Request, res: Response) => {
  try {
    if (!rpcs3Service.fileExists()) {
      res.status(404).json({
        success: false,
        error: `RPCS3 games.yml not found at: ${rpcs3Service.getConfigPath()}. Make sure RPCS3 is installed and has been run at least once.`
      });
      return;
    }

    const playtimes = rpcs3Service.getAllPlaytimes();

    res.json({
      success: true,
      data: playtimes
    });
  } catch (error: any) {
    console.error('Error reading RPCS3 playtimes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to read RPCS3 playtimes'
    });
  }
});

router.get('/trophies', async (req: Request, res: Response) => {
  try {
    if (!trophyService.trophyDirExists()) {
      res.status(404).json({
        success: false,
        error: `RPCS3 trophy directory not found at: ${trophyService.getTrophyPath()}. Make sure RPCS3 has been run and trophies have been earned.`
      });
      return;
    }

    const trophySets = await trophyService.getAllTrophySets();

    res.json({
      success: true,
      data: trophySets
    });
  } catch (error: any) {
    console.error('Error reading RPCS3 trophies:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to read RPCS3 trophies'
    });
  }
});

router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { userId, configPath } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required'
      });
      return;
    }

    if (configPath) {
      rpcs3Service.setConfigPath(configPath);
    }

    if (!rpcs3Service.fileExists()) {
      console.error(`❌ File not found at: ${rpcs3Service.getConfigPath()}/games.yml`);
      res.status(404).json({
        success: false,
        error: `RPCS3 games.yml not found at: ${rpcs3Service.getConfigPath()}/games.yml. Make sure RPCS3 has been run at least once.`
      });
      return;
    }

    const rpcs3Playtimes = rpcs3Service.getAllPlaytimes();

    if (rpcs3Playtimes.length === 0) {
      res.json({
        success: true,
        message: 'No RPCS3 games found',
        summary: {
          total: 0,
          updated: 0,
          notFound: 0
        }
      });
      return;
    }

    let updated = 0;
    let notFound = 0;

    for (const entry of rpcs3Playtimes) {
      
      const game = await prisma.libraryGame.findFirst({
        where: {
          userId,
          platform: 'ps3',
          OR: [
            {
              platformData: {
                path: ['serial'],
                equals: entry.serial
              }
            },
            {
              platformData: {
                path: ['titleId'],
                equals: entry.titleId
              }
            },
            {
              name: {
                contains: entry.gameName
              }
            }
          ]
        }
      });

      if (game) {
        const playtimeMinutes = Math.round(entry.playtimeSeconds / 60);
        const oldPlaytime = game.playtimeForever || 0;

        if (playtimeMinutes > oldPlaytime) {

          const sessionDate = entry.lastPlayed;
          
          await sessionTrackingService.trackSession({
            userId: game.userId,
            gameId: game.id,
            platform: game.platform,
            newPlaytimeMinutes: playtimeMinutes,
            oldPlaytimeMinutes: oldPlaytime,
            sessionDate
          });
        }
        
        await prisma.libraryGame.update({
          where: { id: game.id },
          data: {
            playtimeForever: playtimeMinutes,
            platformData: {
              ...(game.platformData as any),
              serial: entry.serial,
              titleId: entry.titleId,
              lastPlayedRPCS3: entry.lastPlayed
            }
          }
        });

        updated++;
      } else {
        notFound++;
      }
    }

    res.json({
      success: true,
      message: `Synced ${updated} PS3 games`,
      summary: {
        total: rpcs3Playtimes.length,
        updated,
        notFound
      }
    });
  } catch (error: any) {
    console.error('❌ Error syncing RPCS3:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync RPCS3 playtimes'
    });
  }
});

router.post('/sync-trophies', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required'
      });
      return;
    }

    if (!trophyService.trophyDirExists()) {
      res.json({
        success: true,
        summary: {
          total: 0,
          updated: 0,
          notFound: 0
        }
      });
      return;
    }

    const trophySets = await trophyService.getAllTrophySets();

    let updated = 0;
    let notFound = 0;

    for (const trophySet of trophySets) {
      const game = await prisma.libraryGame.findFirst({
        where: {
          userId,
          platform: 'ps3',
          OR: [
            {
              platformData: {
                path: ['npCommId'],
                equals: trophySet.npCommId
              }
            },
            {
              name: {
                contains: trophySet.gameName
              }
            }
          ]
        }
      });

      if (game) {
        await prisma.libraryGame.update({
          where: { id: game.id },
          data: {
            totalAchievements: trophySet.totalTrophies,
            completedAchievements: trophySet.unlockedTrophies,
            achievementPercentage: trophySet.completionPercent,
            platformData: {
              ...(game.platformData as any),
              npCommId: trophySet.npCommId,
              trophies: {
                bronze: trophySet.bronze,
                silver: trophySet.silver,
                gold: trophySet.gold,
                platinum: trophySet.platinum
              },
              trophyList: trophySet.trophies
            }
          }
        });

        updated++;
      } else {
        notFound++;
      }
    }

    res.json({
      success: true,
      summary: {
        total: trophySets.length,
        updated,
        notFound
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync RPCS3 trophies'
    });
  }
});

export default router;
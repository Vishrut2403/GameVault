import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { PCSX2Service } from '../services/pcsx2.service';
import { ISOSerialDetector } from '../services/iso-serial-detector.service';

const router = Router();
const pcsx2Service = new PCSX2Service();
const isoDetector = new ISOSerialDetector();

router.get('/playtimes', async (req: Request, res: Response) => {
  try {
    if (!pcsx2Service.fileExists()) {
      res.status(404).json({
        success: false,
        error: 'PCSX2 playtime file not found. Make sure PCSX2 is installed and has been run at least once.'
      });
      return;
    }

    const playtimes = pcsx2Service.getAllPlaytimes();

    res.json({
      success: true,
      data: playtimes
    });
  } catch (error: any) {
    console.error('Error reading PCSX2 playtimes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to read PCSX2 playtimes'
    });
  }
});

router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { userId, playtimeFilePath } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required'
      });
      return;
    }

    if (playtimeFilePath) {
      pcsx2Service.setPlaytimeFilePath(playtimeFilePath);
    }

    if (!pcsx2Service.fileExists()) {
      res.status(404).json({
        success: false,
        error: `PCSX2 playtime file not found at: ${pcsx2Service['playtimeFilePath']}. Make sure PCSX2 has been run at least once.`
      });
      return;
    }

    const pcsx2Playtimes = pcsx2Service.getAllPlaytimes();

    if (pcsx2Playtimes.length === 0) {
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

    let updated = 0;
    let notFound = 0;

    for (const entry of pcsx2Playtimes) {
      
      const game = await prisma.libraryGame.findFirst({
        where: {
          userId,
          platform: 'retroachievements',
          OR: [
            {
              platformData: {
                path: ['serial'],
                equals: entry.serial
              }
            },
            {
              name: {
                contains: entry.serial
              }
            }
          ]
        }
      });

      if (game) {
        const playtimeMinutes = Math.round(entry.playtimeSeconds / 60);
        
        await prisma.libraryGame.update({
          where: { id: game.id },
          data: {
            playtimeForever: playtimeMinutes,
            platformData: {
              ...(game.platformData as any),
              serial: entry.serial,
              lastPlayedPCSX2: entry.lastPlayed,
              pcsx2PlaytimeSeconds: entry.playtimeSeconds
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
        total: pcsx2Playtimes.length,
        updated,
        notFound
      }
    });
  } catch (error: any) {
    console.error('❌ Error syncing PCSX2 playtimes:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync PCSX2 playtimes'
    });
  }
});

router.post('/link-game', async (req: Request, res: Response) => {
  try {
    const { userId, gameId, serial } = req.body;

    if (!userId || !gameId || !serial) {
      res.status(400).json({
        success: false,
        error: 'userId, gameId, and serial are required'
      });
      return;
    }
    const playtimeSeconds = pcsx2Service.getPlaytimeForSerial(serial);

    if (playtimeSeconds === null) {
      res.status(404).json({
        success: false,
        error: `Serial ${serial} not found in PCSX2 playtime data`
      });
      return;
    }

    const playtimeMinutes = Math.round(playtimeSeconds / 60);

    const game = await prisma.libraryGame.update({
      where: { id: gameId },
      data: {
        playtimeForever: playtimeMinutes,
        platformData: {
          ...(await prisma.libraryGame.findUnique({ where: { id: gameId } }))?.platformData as any,
          serial
        }
      }
    });

    res.json({
      success: true,
      data: game
    });
  } catch (error: any) {
    console.error('Error linking game:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to link game'
    });
  }
});

router.get('/scan-isos', async (req: Request, res: Response) => {
  try {
    const { directory } = req.query;

    if (!directory || typeof directory !== 'string') {
      res.status(400).json({
        success: false,
        error: 'directory parameter is required'
      });
      return;
    }

    const isoInfos = await isoDetector.scanDirectory(directory);

    res.json({
      success: true,
      data: isoInfos
    });
  } catch (error: any) {
    console.error('Error scanning ISOs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to scan ISO directory'
    });
  }
});

router.post('/auto-link', async (req: Request, res: Response) => {
  try {
    const { userId, isoDirectory } = req.body;

    if (!userId || !isoDirectory) {
      res.status(400).json({
        success: false,
        error: 'userId and isoDirectory are required'
      });
      return;
    }

    const isoInfos = await isoDetector.scanDirectory(isoDirectory);

    const raGames = await prisma.libraryGame.findMany({
      where: {
        userId,
        platform: 'retroachievements'
      }
    });

    let linked = 0;
    let notMatched = 0;

    for (const game of raGames) {
      const matchedISO = isoDetector.findBestMatch(game.name, isoInfos);

      if (matchedISO && matchedISO.serial) {
        await prisma.libraryGame.update({
          where: { id: game.id },
          data: {
            platformData: {
              ...(game.platformData as any),
              serial: matchedISO.serial,
              isoPath: matchedISO.filepath
            }
          }
        });
        linked++;
      } else {
        notMatched++;
      }
    }

    res.json({
      success: true,
      summary: {
        totalGames: raGames.length,
        totalISOs: isoInfos.length,
        linked,
        notMatched
      }
    });
  } catch (error: any) {
    console.error('Error auto-linking:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to auto-link games'
    });
  }
});

export default router;
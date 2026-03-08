import express, { Request, Response } from 'express';
import { retroAchievementsService } from '../services/retroachievements.service';
import prisma from '../prisma';
import { getSerialByGameId, getSerialByName } from '../utils/ps2-serials';

const router = express.Router();

// GET /api/retroachievements/user/:username - Get user summary
router.get('/user/:username', async (req: Request, res: Response): Promise<void> => {
  try {
    const username = Array.isArray(req.params.username) ? req.params.username[0] : req.params.username;
    
    const summary = await retroAchievementsService.getUserSummary(username);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    console.error('Error fetching RA user summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch user summary'
    });
  }
});

// GET /api/retroachievements/games/:username - Get user's game progress
router.get('/games/:username', async (req: Request, res: Response): Promise<void> => {
  try {
    const username = Array.isArray(req.params.username) ? req.params.username[0] : req.params.username;
    
    const games = await retroAchievementsService.getUserProgress(username);
    
    res.json({
      success: true,
      count: games.length,
      data: games
    });
  } catch (error: any) {
    console.error('Error fetching RA games:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch games'
    });
  }
});

router.get('/game/:gameId', async (req: Request, res: Response): Promise<void> => {
  try {
    const gameIdParam = Array.isArray(req.params.gameId) ? req.params.gameId[0] : req.params.gameId;
    const gameId = parseInt(gameIdParam);
    
    if (isNaN(gameId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid game ID'
      });
      return;
    }
    
    const gameInfo = await retroAchievementsService.getGameInfoExtended(gameId);
    
    res.json({
      success: true,
      data: gameInfo
    });
  } catch (error: any) {
    console.error('Error fetching RA game info:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch game info'
    });
  }
});

router.post('/sync', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, username } = req.body;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required'
      });
      return;
    }
    
    const { summary, games } = await retroAchievementsService.syncUserLibrary(username);
    
    let added = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const game of games) {
      try {
        
        const completionPercent = retroAchievementsService.calculateCompletion(
          game.numAchieved,
          game.numPossibleAchievements
        );
        
        const isMastered = retroAchievementsService.isMastered(
          game.numAchievedHardcore,
          game.numPossibleAchievements
        );
        
        const headerImage = retroAchievementsService.getGameIconUrl(game.imageIcon);
        
        const platformData = {
          consoleId: game.consoleId,
          consoleName: game.consoleName,
          consoleDisplayName: retroAchievementsService.getConsoleDisplayName(
            game.consoleId,
            game.consoleName
          ),
          possibleScore: game.possibleScore,
          scoreAchieved: game.scoreAchieved,
          scoreAchievedHardcore: game.scoreAchievedHardcore,
          numAchievedHardcore: game.numAchievedHardcore,
          isMastered,
          lastPlayed: game.lastPlayed || null,
          imageIcon: game.imageIcon
        };
        
        const existing = await prisma.libraryGame.findUnique({
          where: {
            userId_platform_platformGameId: {
              userId,
              platform: 'retroachievements',
              platformGameId: String(game.gameId)
            }
          }
        });
        
        const gameData = {
          userId,
          platform: 'retroachievements',
          platformGameId: String(game.gameId),
          name: game.title,
          headerImage,
          totalAchievements: game.numPossibleAchievements,
          completedAchievements: game.numAchieved,
          achievementPercentage: completionPercent,
          platformData,
          retroAchievementsId: String(game.gameId),
          retroAchievementsData: platformData,
          status: isMastered ? 'completed' : (completionPercent > 0 ? 'playing' : 'unplayed'),
          lastPlayedAt: game.lastPlayed ? new Date(game.lastPlayed) : null,
          updatedAt: new Date()
        };
        
        if (existing) {
          await prisma.libraryGame.update({
            where: { id: existing.id },
            data: gameData
          });
          updated++;
        } else {
          await prisma.libraryGame.create({
            data: gameData
          });
          added++;
        }
        
      } catch (gameError: any) {
        console.error(`   ❌ Failed to process game ${game.title}:`, gameError.message);
        skipped++;
      }
    }
    
    res.json({
      success: true,
      summary: {
        totalGames: games.length,
        added,
        updated,
        skipped,
        totalPoints: summary.totalPoints,
        totalTruePoints: summary.totalTruePoints,
        totalAwarded: summary.totalAwarded
      }
    });
    
  } catch (error: any) {
    console.error('Error syncing RA library:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync library'
    });
  }
});

router.post('/game', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, gameId, username } = req.body;
    
    if (!userId || !gameId) {
      res.status(400).json({
        success: false,
        error: 'userId and gameId are required'
      });
      return;
    }

    let gameInfo;
    try {
      gameInfo = await retroAchievementsService.getGameInfo(parseInt(gameId));
    } catch (err: any) {
      console.error('❌ Failed to fetch game info:', err.message);
      res.status(404).json({
        success: false,
        error: `Failed to fetch game ${gameId} from RetroAchievements. Check if game ID is valid.`
      });
      return;
    }
    
    const title = gameInfo.Title || gameInfo.GameTitle;
    const consoleId = gameInfo.ConsoleID;
    const consoleName = gameInfo.ConsoleName;
    const imageIcon = gameInfo.ImageIcon || gameInfo.GameIcon;
    const imageBoxArt = gameInfo.ImageBoxArt;
    const imageTitle = gameInfo.ImageTitle;
    const imageIngame = gameInfo.ImageIngame;
    const developer = gameInfo.Developer;
    const publisher = gameInfo.Publisher;
    const genre = gameInfo.Genre;
    const released = gameInfo.Released;
    
    if (!gameInfo || !title) {
      console.error('❌ Game info incomplete:', gameInfo);
      res.status(404).json({
        success: false,
        error: `Game ${gameId} not found or incomplete data from RetroAchievements`
      });
      return;
    }

    let userProgress = null;
    if (username) {
      try {
        console.log(`📊 Fetching user progress for ${username}...`);
        const allProgress = await retroAchievementsService.getUserProgress(username);
        userProgress = allProgress.find(g => g.gameId === parseInt(gameId));
        console.log(`✅ User progress: ${userProgress ? 'Found' : 'Not found (new game)'}`);
      } catch (err) {
        console.log('⚠️ Could not fetch user progress, using defaults');
      }
    }

    const numAchieved = userProgress?.numAchieved || 0;
    const numPossible = userProgress?.numPossibleAchievements || 0;
    const completionPercent = retroAchievementsService.calculateCompletion(numAchieved, numPossible);
    
    const headerImage = imageBoxArt 
      ? retroAchievementsService.getGameBoxArtUrl(imageBoxArt)
      : imageIcon 
        ? retroAchievementsService.getGameIconUrl(imageIcon)
        : null;
    
    const ps2Serial = getSerialByGameId(gameId) || getSerialByName(title);
    if (ps2Serial) {
    }
    
    const platformData = {
      consoleId: consoleId,
      consoleName: consoleName,
      consoleDisplayName: retroAchievementsService.getConsoleDisplayName(
        consoleId,
        consoleName
      ),
      developer: developer,
      publisher: publisher,
      genre: genre,
      released: released,
      imageIcon: imageIcon,
      imageBoxArt: imageBoxArt,
      imageTitle: imageTitle,
      imageIngame: imageIngame,
      numAchieved: numAchieved,
      scoreAchieved: userProgress?.scoreAchieved || 0,
      numAchievedHardcore: userProgress?.numAchievedHardcore || 0,
      scoreAchievedHardcore: userProgress?.scoreAchievedHardcore || 0,
      serial: ps2Serial
    };
    
    const game = await prisma.libraryGame.upsert({
      where: {
        userId_platform_platformGameId: {
          userId,
          platform: 'retroachievements',
          platformGameId: String(gameId)
        }
      },
      create: {
        userId,
        platform: 'retroachievements',
        platformGameId: String(gameId),
        name: title,
        headerImage,
        totalAchievements: numPossible,
        completedAchievements: numAchieved,
        achievementPercentage: completionPercent,
        platformData,
        retroAchievementsId: String(gameId),
        retroAchievementsData: platformData,
        status: 'unplayed'
      },
      update: {
        name: title,
        headerImage,
        totalAchievements: numPossible,
        completedAchievements: numAchieved,
        achievementPercentage: completionPercent,
        platformData,
        retroAchievementsData: platformData,
        updatedAt: new Date()
      }
    });
    
    res.json({
      success: true,
      data: game
    });
    
  } catch (error: any) {
    console.error('Error adding RA game:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add game'
    });
  }
});

router.delete('/game/:platformGameId', async (req: Request, res: Response): Promise<void> => {
  try {
    const platformGameId = Array.isArray(req.params.platformGameId) ? req.params.platformGameId[0] : req.params.platformGameId;
    const { userId } = req.query;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required'
      });
      return;
    }
    
    await prisma.libraryGame.delete({
      where: {
        userId_platform_platformGameId: {
          userId: String(userId),
          platform: 'retroachievements',
          platformGameId
        }
      }
    });
    
    res.json({
      success: true,
      message: 'Game deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Error deleting RA game:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete game'
    });
  }
});

router.get('/consoles', async (req: Request, res: Response): Promise<void> => {
  try {
    const consoles = await retroAchievementsService.getConsoles();
    
    res.json({
      success: true,
      data: consoles
    });
  } catch (error: any) {
    console.error('Error fetching consoles:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch consoles'
    });
  }
});

export default router;
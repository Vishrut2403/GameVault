import express, { Request, Response } from 'express';
import { retroAchievementsService } from '../services/retroachievements.service';
import prisma from '../prisma';
import { decrypt } from '../utils/encryption';
import { getSerialByGameId, getSerialByName } from '../utils/ps2-serials';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = express.Router();

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

router.post('/sync', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const userId = req.user?.userId;
		if (!userId) {
			res.status(401).json({
				success: false,
				error: 'Unauthorized'
			});
			return;
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { raUsername: true, raApiKey: true }
		});

		if (!user?.raUsername) {
			res.status(400).json({
				success: false,
				error: 'RetroAchievements username is not linked to this account'
			});
			return;
		}
		// Decrypt stored API key (must exist)
		let apiKeyPlain = process.env.RA_API_KEY || '';
		if (user.raApiKey) {
			try {
				apiKeyPlain = decrypt(user.raApiKey);
			} catch (e) {
				console.error('Failed to decrypt stored RA API key:', e);
					res.status(500).json({ success: false, error: 'Failed to decrypt RA credentials' });
					return;
			}
		}

		// Set credentials on the service for this operation
		try {
			retroAchievementsService.setCredentials(user.raUsername, apiKeyPlain);

			const { summary, games } = await retroAchievementsService.syncUserLibrary(user.raUsername);

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
				
				const imageUrl = retroAchievementsService.getGameIconUrl(game.imageIcon);
				
				const ps2Serial = getSerialByGameId(game.gameId) || getSerialByName(game.title);
				if (ps2Serial) {
					console.log(`Found serial: ${ps2Serial}`);
				}
				
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
					imageIcon: game.imageIcon,
					serial: ps2Serial  
				};
				
				const existing = await prisma.libraryGame.findUnique({
					where: {
						userId_platformGameId_platform: {
							userId,
							platformGameId: String(game.gameId),
							platform: 'retroachievements'
						}
					}
				});
				
				const gameData = {
					userId,
					platform: 'retroachievements',
					platformGameId: String(game.gameId),
					name: game.title,
					imageUrl,
					achievementsTotal: game.numPossibleAchievements,
					achievementsEarned: game.numAchieved,
					platformData,
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
				console.error(`Failed to process game ${game.title}:`, gameError.message);
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
		} finally {
			try { retroAchievementsService.setCredentials('', ''); } catch (e) { /* ignore */ }
		}

	} catch (error: any) {
		console.error('Error syncing RA library:', error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to sync library'
		});
	}
});

router.post('/game', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const userId = req.user?.userId;
		const { gameId } = req.body;
		
		if (!userId || !gameId) {
			res.status(400).json({
				success: false,
				error: 'gameId is required'
			});
			return;
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { raUsername: true }
		});

		if (!user?.raUsername) {
			res.status(400).json({
				success: false,
				error: 'RetroAchievements username is not linked to this account'
			});
			return;
		}
		let gameInfo;
		try {
			gameInfo = await retroAchievementsService.getGameInfo(parseInt(gameId));
			console.log(`Got game info:`, gameInfo);
		} catch (err: any) {
			console.error('Failed to fetch game info:', err.message);
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
			console.error('Game info incomplete:', gameInfo);
			res.status(404).json({
				success: false,
				error: `Game ${gameId} not found or incomplete data from RetroAchievements`
			});
			return;
		}

		let userProgress = null;
		if (user.raUsername) {
				const allProgress = await retroAchievementsService.getUserProgress(user.raUsername);
				userProgress = allProgress.find(g => g.gameId === parseInt(gameId));
		}
		
		const numAchieved = userProgress?.numAchieved || 0;
		const numPossible = userProgress?.numPossibleAchievements || 0;
		const completionPercent = retroAchievementsService.calculateCompletion(numAchieved, numPossible);
		
		const imageUrl = imageBoxArt 
			? retroAchievementsService.getGameBoxArtUrl(imageBoxArt)
			: imageIcon 
				? retroAchievementsService.getGameIconUrl(imageIcon)
				: null;
		
		// Try to get PS2 serial for PCSX2 matching
		const ps2Serial = getSerialByGameId(gameId) || getSerialByName(title);
		
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
				userId_platformGameId_platform: {
					userId,
					platformGameId: String(gameId),
					platform: 'retroachievements'
				}
			},
			create: {
				userId,
				platform: 'retroachievements',
				platformGameId: String(gameId),
				name: title,
				imageUrl,
				achievementsTotal: numPossible,
				achievementsEarned: numAchieved,
				platformData,
				status: 'unplayed'
			},
			update: {
				name: title,
				imageUrl,
				achievementsTotal: numPossible,
				achievementsEarned: numAchieved,
				platformData,
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

router.delete('/game/:platformGameId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const platformGameId = Array.isArray(req.params.platformGameId) ? req.params.platformGameId[0] : req.params.platformGameId;
		const userId = req.user?.userId;
		
		if (!userId) {
			res.status(400).json({
				success: false,
				error: 'Unauthorized'
			});
			return;
		}
		
		await prisma.libraryGame.delete({
			where: {
				userId_platformGameId_platform: {
					userId,
					platformGameId,
					platform: 'retroachievements'
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
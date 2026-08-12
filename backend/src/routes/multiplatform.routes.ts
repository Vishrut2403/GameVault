import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { MinecraftService } from '../services/minecraft.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const minecraftService = new MinecraftService();

router.use(authMiddleware);

router.post('/games/manual', async (req: AuthRequest, res: Response) => {
	try {
		const {
			platform,
			platformGameId,
			name,
			playtimeForever,
			pricePaid,
			status,
			rating,
			review,
			userTags,
			platformData,
		} = req.body;
		const userId = req.user?.userId;

		if (!userId || !platform || !platformGameId || !name) {
			res.status(400).json({ error: 'Missing required fields' });
			return;
		}

		const validPlatforms = ['apple_gc', 'minecraft', 'retroachievements', 'ps2', 'ps3', 'steam', 'manual'];
		if (!validPlatforms.includes(platform)) {
			res.status(400).json({ error: 'Invalid platform' });
			return;
		}

		const hours = playtimeForever / 60;
		const pricePerHour = pricePaid && hours > 0 ? pricePaid / hours : null;

		const game = await prisma.libraryGame.create({
			data: {
				userId,
				platform,
				platformGameId,
				name,
				playtimeForever: playtimeForever || 0,
				pricePaid: pricePaid || null,
				pricePerHour,
				status: status || 'unplayed',
				rating: rating || null,
				review: review || null,
				userTags: userTags || [],
				platformData: platformData || null,
			},
		});

		res.json({ success: true, game });
	} catch (error) {
		res.status(500).json({
			error: 'Failed to add game',
			message: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

router.patch('/games/:platform/:platformGameId', async (req: AuthRequest, res: Response) => {
	try {
		const platform = Array.isArray(req.params.platform) ? req.params.platform[0] : req.params.platform;
		const platformGameId = Array.isArray(req.params.platformGameId) ? req.params.platformGameId[0] : req.params.platformGameId;
		const { userId, ...updateData } = req.body;
		const authenticatedUserId = req.user?.userId;

		if (!platform || !platformGameId) {
			res.status(400).json({ error: 'platform and platformGameId are required' });
			return;
		}

		if (!authenticatedUserId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		if (userId && userId !== authenticatedUserId) {
			res.status(403).json({ error: 'You can only update your own games' });
			return;
		}

		const effectiveUserId = authenticatedUserId;

		if (updateData.pricePaid !== undefined || updateData.playtimeForever !== undefined) {
			const game = await prisma.libraryGame.findUnique({
				where: {
					userId_platformGameId_platform: {
						userId: effectiveUserId,
						platformGameId: platformGameId,
						platform: platform,
					},
				},
			});

			if (game) {
				const newPlaytime = updateData.playtimeForever ?? game.playtimeForever;
				const newPrice = updateData.pricePaid ?? game.pricePaid;
				const hours = (newPlaytime || 0) / 60;
				updateData.pricePerHour = newPrice && hours > 0 ? newPrice / hours : null;
			}
		}

		const updated = await prisma.libraryGame.update({
			where: {
				userId_platformGameId_platform: {
					userId: effectiveUserId,
					platformGameId: platformGameId,
					platform: platform,
				},
			},
			data: updateData,
		});

		res.json({ success: true, game: updated });
	} catch (error) {
		res.status(500).json({
			error: 'Failed to update game',
			message: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

router.delete('/games/:platform/:platformGameId', async (req: AuthRequest, res: Response) => {
	try {
		const platform = Array.isArray(req.params.platform) ? req.params.platform[0] : req.params.platform;
		const platformGameId = Array.isArray(req.params.platformGameId) ? req.params.platformGameId[0] : req.params.platformGameId;
		const { userId } = req.body;
		const authenticatedUserId = req.user?.userId;

		if (!platform || !platformGameId) {
			res.status(400).json({ error: 'platform and platformGameId are required' });
			return;
		}

		if (!authenticatedUserId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		if (userId && userId !== authenticatedUserId) {
			res.status(403).json({ error: 'You can only delete your own games' });
			return;
		}

		await prisma.libraryGame.delete({
			where: {
				userId_platformGameId_platform: {
					userId: authenticatedUserId,
					platformGameId: platformGameId,
					platform: platform,
				},
			},
		});

		res.json({ success: true, message: 'Game deleted' });
	} catch (error) {
		res.status(500).json({
			error: 'Failed to delete game',
			message: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

router.patch('/games/:platform/:platformGameId/image', async (req: AuthRequest, res: Response) => {
	try {
		const platform = Array.isArray(req.params.platform) ? req.params.platform[0] : req.params.platform;
		const platformGameId = Array.isArray(req.params.platformGameId) ? req.params.platformGameId[0] : req.params.platformGameId;
		const { userId, headerImage } = req.body;
		const authenticatedUserId = req.user?.userId;

		if (!platform || !platformGameId) {
			res.status(400).json({ error: 'platform and platformGameId are required' });
			return;
		}

		if (!authenticatedUserId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		if (userId && userId !== authenticatedUserId) {
			res.status(403).json({ error: 'You can only update your own games' });
			return;
		}

		if (!headerImage || typeof headerImage !== 'string') {
			res.status(400).json({ error: 'userId and headerImage are required' });
			return;
		}

		if (!headerImage.startsWith('http://') && !headerImage.startsWith('https://')) {
			res.status(400).json({ error: 'Image URL must be a valid HTTP/HTTPS URL' });
			return;
		}

		const updated = await prisma.libraryGame.update({
			where: {
				userId_platformGameId_platform: {
					userId: authenticatedUserId,
					platformGameId: platformGameId,
					platform: platform,
				},
			},
			data: { imageUrl: headerImage },
		});

		res.json({ success: true, game: updated });
	} catch (error) {
		res.status(500).json({
			error: 'Failed to update image',
			message: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

router.get('/minecraft/instances', async (req: Request, res: Response) => {
	try {
		const instances = await minecraftService.getInstances();
		res.json({ success: true, instances });
	} catch (error) {
		res.status(500).json({
			error: 'Failed to load Minecraft instances',
			message: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

router.post('/minecraft/sync', async (req: AuthRequest, res: Response) => {
	try {
		const { worldPath, worldName, instanceName } = req.body;
		const userId = req.user?.userId;

		if (!userId || !worldPath || !worldName) {
			res.status(400).json({ error: 'Missing required fields' });
			return;
		}

		const gameData = await minecraftService.syncMinecraftData(
			userId,
			worldPath,
			worldName,
			instanceName
		);

		const mappedData = {
			...gameData,
			achievementsTotal: (gameData as any).totalAchievements || (gameData as any).achievementsTotal,
			achievementsEarned: (gameData as any).completedAchievements || (gameData as any).achievementsEarned,
			imageUrl: (gameData as any).headerImage || (gameData as any).imageUrl,
		};

		delete (mappedData as any).totalAchievements;
		delete (mappedData as any).completedAchievements;
		delete (mappedData as any).achievementPercentage;
		delete (mappedData as any).headerImage;
		delete (mappedData as any).minecraftStats;

		const game = await prisma.libraryGame.upsert({
			where: {
				userId_platformGameId_platform: {
					userId,
					platformGameId: mappedData.platformGameId,
					platform: 'minecraft',
				},
			},
			create: mappedData,
			update: {
				playtimeForever: mappedData.playtimeForever,
				achievementsTotal: mappedData.achievementsTotal,
				achievementsEarned: mappedData.achievementsEarned,
				platformData: mappedData.platformData,
			},
		});

		res.json({ success: true, game });
	} catch (error) {
		res.status(500).json({
			error: 'Failed to sync Minecraft world',
			message: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

export default router;
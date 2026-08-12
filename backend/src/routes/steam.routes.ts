import { Router, Request, Response } from 'express';
import steamService from '../services/steam.service';
import prisma from '../prisma';
import { syncSteamLibrary } from '../services/steam-sync.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

const requireSteamOwnership = async (req: AuthRequest, res: Response, steamId: string) => {
	if (!req.user?.userId) {
		res.status(401).json({ error: 'Unauthorized' });
		return false;
	}

	const currentUser = await prisma.user.findUnique({
		where: { id: req.user.userId },
		select: { steamId: true }
	});

	if (!currentUser?.steamId) {
		res.status(403).json({ error: 'Steam account is not linked' });
		return false;
	}

	if (currentUser.steamId !== steamId) {
		res.status(403).json({ error: 'You can only access your own Steam library' });
		return false;
	}

	return true;
};

router.get('/library/:steamId', authMiddleware, async (req: AuthRequest, res: Response) => {
	try {
		const steamId = req.params.steamId as string;

		if (!steamId) {
			res.status(400).json({ error: 'Steam ID is required' });
			return;
		}

		if (!(await requireSteamOwnership(req, res, steamId))) {
			return;
		}

		const { count, games } = await syncSteamLibrary(steamId);

		res.json({
			success: true,
			count,
			games
		});
	} catch (error) {
		res.status(500).json({
			error: 'Failed to fetch Steam library',
			message: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

router.get('/library/:steamId/enriched', authMiddleware, async (req: AuthRequest, res: Response) => {
	try {
		const steamId = req.params.steamId as string;

		if (!steamId) {
			res.status(400).json({ error: 'Steam ID is required' });
			return;
		}

		if (!(await requireSteamOwnership(req, res, steamId))) {
			return;
		}

		const user = await prisma.user.findUnique({
			where: { steamId },
			include: {
				games: {
					// Steam is the only supported platform. Rows left behind by the
					// removed integrations stay in the DB but are never served, so the
					// UI can't show games its Steam-only endpoints are unable to edit.
					where: { platform: 'steam' },
					orderBy: [
						{ status: 'asc' },
						{ playtimeForever: 'desc' }
					],
					select: {
						id: true,
						userId: true,
						platform: true,
						platformGameId: true,
						name: true,
						imageUrl: true,
						playtimeForever: true,
						lastPlayedAt: true,
						status: true,
						rating: true,
						review: true,
						userTags: true,
						pricePaid: true,
						pricePerHour: true,
						achievementsTotal: true,
						achievementsEarned: true,
						platformData: true,
						createdAt: true,
						updatedAt: true,
					}
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

router.get('/library/:steamId/filter', authMiddleware, async (req: AuthRequest, res: Response) => {
	try {
		const steamId = req.params.steamId as string;

		if (!steamId) {
			res.status(400).json({ error: 'Steam ID is required' });
			return;
		}

		if (!(await requireSteamOwnership(req, res, steamId))) {
			return;
		}

		const user = await prisma.user.findUnique({ where: { steamId } });
		if (!user) {
			res.status(404).json({ error: 'User not found' });
			return;
		}

		const statusesParam = req.query.statuses as string | undefined;
		const minRatingParam = req.query.minRating as string | undefined;
		const maxRatingParam = req.query.maxRating as string | undefined;
		const maxPriceParam = req.query.maxPrice as string | undefined;
		const tagsParam = req.query.tags as string | undefined;
		const searchParam = req.query.search as string | undefined;

		const whereClause: any = { userId: user.id, platform: 'steam' };

		if (statusesParam) {
			const statuses = statusesParam.split(',').filter(s => s.trim());
			if (statuses.length > 0) {
				whereClause.status = { in: statuses };
			}
		}

		const minRating = minRatingParam ? parseInt(minRatingParam) : undefined;
		const maxRating = maxRatingParam ? parseInt(maxRatingParam) : undefined;
		
		if (minRating !== undefined || maxRating !== undefined) {
			const ratingFilter: any[] = [];
			
			const ratingRangeFilter: any = {};
			if (minRating !== undefined && minRating > 0) {
				ratingRangeFilter.gte = minRating;
			}
			if (maxRating !== undefined && maxRating < 5) {
				ratingRangeFilter.lte = maxRating;
			}
			
			ratingFilter.push({ rating: ratingRangeFilter });
			
			if (minRating !== undefined && minRating <= 1 && (maxRating === undefined || maxRating >= 1)) {
				ratingFilter.push({ rating: null });
			}
			
			whereClause.OR = ratingFilter;
		}

		if (maxPriceParam) {
			const maxPrice = parseFloat(maxPriceParam);
			if (!isNaN(maxPrice) && maxPrice > 0) {
				whereClause.pricePaid = { lte: maxPrice };
			}
		}

		if (tagsParam) {
			const tags = tagsParam.split(',').filter(t => t.trim());
			if (tags.length > 0) {
				whereClause.AND = tags.map(tag => ({
					userTags: {
						has: tag
					}
				}));
			}
		}

		let games = await prisma.libraryGame.findMany({
			where: whereClause,
			orderBy: [
				{ status: 'asc' },
				{ playtimeForever: 'desc' }
			]
		});

		if (searchParam && searchParam.trim()) {
			const searchLower = searchParam.toLowerCase();
			games = games.filter(game => 
				game.name.toLowerCase().includes(searchLower)
			);
		}

		res.json({
			success: true,
			userId: user.id,
			count: games.length,
			games,
		});
	} catch (error) {
		res.status(500).json({
			error: 'Failed to fetch filtered library',
			message: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

router.patch('/library/:steamId/game/:appId/price', authMiddleware, async (req: AuthRequest, res: Response) => {
	try {
		const steamId = req.params.steamId as string;
		const appId = req.params.appId as string;
		const { pricePaid } = req.body;

		if (!steamId || !appId) {
			res.status(400).json({ error: 'Steam ID and App ID are required' });
			return;
		}

		if (!(await requireSteamOwnership(req, res, steamId))) {
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

router.patch('/library/:steamId/game/:appId/status', authMiddleware, async (req: AuthRequest, res: Response) => {
	try {
		const steamId = req.params.steamId as string;
		const appId = req.params.appId as string;
		const { status } = req.body;

		if (!steamId || !appId) {
			res.status(400).json({ error: 'Steam ID and App ID are required' });
			return;
		}

		if (!(await requireSteamOwnership(req, res, steamId))) {
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

router.patch('/library/:steamId/game/:appId/rating', authMiddleware, async (req: AuthRequest, res: Response) => {
	try {
		const steamId = req.params.steamId as string;
		const appId = req.params.appId as string;
		const { rating } = req.body;

		if (!steamId || !appId) {
			res.status(400).json({ error: 'Steam ID and App ID are required' });
			return;
		}

		if (!(await requireSteamOwnership(req, res, steamId))) {
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

router.patch('/library/:steamId/game/:appId/tags', authMiddleware, async (req: AuthRequest, res: Response) => {
	try {
		const steamId = req.params.steamId as string;
		const appId = req.params.appId as string;
		const { tags } = req.body;

		if (!steamId || !appId) {
			res.status(400).json({ error: 'Steam ID and App ID are required' });
			return;
		}

		if (!(await requireSteamOwnership(req, res, steamId))) {
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

router.patch('/library/:steamId/game/:appId/review', authMiddleware, async (req: AuthRequest, res: Response) => {
	try {
		const steamId = req.params.steamId as string;
		const appId = req.params.appId as string;
		const { review } = req.body;

		if (!steamId || !appId) {
			res.status(400).json({ error: 'Steam ID and App ID are required' });
			return;
		}

		if (!(await requireSteamOwnership(req, res, steamId))) {
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

router.patch('/library/:steamId/game/:appId/image', authMiddleware, async (req: AuthRequest, res: Response) => {
	try {
		const steamId = req.params.steamId as string;
		const appId = req.params.appId as string;
		const { headerImage } = req.body;

		if (!steamId || !appId) {
			res.status(400).json({ error: 'Steam ID and App ID are required' });
			return;
		}

		if (!(await requireSteamOwnership(req, res, steamId))) {
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

router.get('/player/:steamId', authMiddleware, async (req: AuthRequest, res: Response) => {
	try {
		const steamId = req.params.steamId as string;

		if (!steamId) {
			res.status(400).json({ error: 'Steam ID is required' });
			return;
		}

		if (!(await requireSteamOwnership(req, res, steamId))) {
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
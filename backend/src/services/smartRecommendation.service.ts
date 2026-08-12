import prisma from '../prisma';

interface GameScore {
	gameId: string;
	name: string;
	score: number;
	reasons: string[];
	playtimeForever: number;
	rating: number | null;
	userTags: string[];
	platform: string;
	achievementRate: number;
}

export class SmartRecommendationService {

	static async getSmartRecommendations(userId: string, limit: number = 5): Promise<GameScore[]> {
		try {
			// Get user's library with ratings, status, playtime
			const library = await prisma.libraryGame.findMany({
				where: { userId, platform: 'steam' },
				select: {
					id: true,
					name: true,
					platform: true,
					playtimeForever: true,
					rating: true,
					status: true,
					userTags: true,
					achievementsEarned: true,
					achievementsTotal: true,
				},
			});

			if (library.length === 0) {
				return [];
			}

			const userProfile = this.analyzeUserProfile(library);

			const backlogGames = library.filter(g => g.status === 'backlog');
			
			if (backlogGames.length === 0) {
				return [];
			}

			const scoredGames = backlogGames.map(game => {
				const reasons: string[] = [];
				let score = 50; // Base score

				// Factor 1: Tag similarity (20 points max)
				const tagScore = this.calculateTagSimilarity(game.userTags, userProfile.preferredTags);
				score += tagScore;
				if (tagScore > 5) reasons.push(`Matches your preferred tags`);

				// Factor 2: Platform preference (15 points max)
				const platformScore = this.calculatePlatformScore(
					game.platform,
					userProfile.platformDistribution
				);
				score += platformScore;

				// Factor 3: Similar to highly-rated games (20 points max)
				const similarityScore = this.calculateSimilarityToFavorites(
					game.userTags,
					userProfile.favoriteTagCombos
				);
				score += similarityScore;
				if (similarityScore > 5) reasons.push(`Similar to games you love`);

				// Factor 4: Completion potential (15 points max)
				if (userProfile.completionRate > 0.7) {
					score += 8;
					reasons.push(`Good match for completion-oriented player`);
				}

				// Factor 5: Achievement density boost (10 points max)
				if (userProfile.achievementHunter && game.achievementsTotal && game.achievementsTotal > 0) {
					score += 8;
					reasons.push(`Has achievements for you to hunt`);
				}

				score = Math.min(100, score);

				const achievementRate = (game.achievementsEarned || 0) / Math.max(game.achievementsTotal || 1, 1);

				return {
					gameId: game.id,
					name: game.name,
					score,
					reasons: reasons.length > 0 ? reasons : ['Based on your gaming profile'],
					playtimeForever: game.playtimeForever || 0,
					rating: game.rating,
					userTags: game.userTags,
					platform: game.platform,
					achievementRate,
				};
			});

			return scoredGames
				.sort((a, b) => b.score - a.score)
				.slice(0, limit);
		} catch (error) {
			console.error('Error in smart recommendations:', error);
			throw error;
		}
	}

	private static analyzeUserProfile(library: any[]) {
		const completedGames = library.filter(g => g.status === 'completed');
		const ratedGames = library.filter(g => g.rating !== null && g.rating > 0);
		const topRatedGames = ratedGames.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10);

		const preferredTags = new Map<string, number>();
		topRatedGames.forEach(game => {
			game.userTags?.forEach((tag: string) => {
				preferredTags.set(tag, (preferredTags.get(tag) || 0) + 1);
			});
		});

		const favoriteTagCombos = topRatedGames.map(g => g.userTags || []);

		const platformDistribution = new Map<string, number>();
		library.forEach(game => {
			platformDistribution.set(
				game.platform,
				(platformDistribution.get(game.platform) || 0) + 1
			);
		});

		const completionRate =
			library.length > 0 ? completedGames.length / library.length : 0;

		const achievementGames = library.filter(g => g.achievementsTotal && g.achievementsTotal > 0);
		const avgAchievementRate =
			achievementGames.length > 0
				? achievementGames.reduce((sum, g) => sum + ((g.achievementsEarned || 0) / (g.achievementsTotal || 1)), 0) / achievementGames.length
				: 0;
		const achievementHunter = avgAchievementRate > 0.5;

		return {
			preferredTags: Array.from(preferredTags.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, 10)
				.map(([tag]) => tag),
			favoriteTagCombos,
			platformDistribution,
			completionRate,
			achievementHunter,
			totalGames: library.length,
		};
	}

	private static calculateTagSimilarity(gameTags: string[], preferredTags: string[]): number {
		if (!gameTags || gameTags.length === 0) return 0;
		const matches = gameTags.filter(tag => preferredTags.includes(tag)).length;
		return Math.min(20, (matches / Math.max(gameTags.length, 1)) * 20);
	}

	private static calculatePlatformScore(
		platform: string,
		platformDistribution: Map<string, number>
	): number {
		const count = platformDistribution.get(platform) || 0;
		const totalGames = Array.from(platformDistribution.values()).reduce((a, b) => a + b, 0);

		const proportion = count / Math.max(totalGames, 1);
		if (proportion < 0.1) return 12;
		if (proportion < 0.2) return 8;
		return 3;
	}

	private static calculateSimilarityToFavorites(
		gameTags: string[],
		favoriteTagCombos: string[][]
	): number {
		if (!gameTags || gameTags.length === 0) return 0;

		let maxSimilarity = 0;
		favoriteTagCombos.forEach(combo => {
			const matches = gameTags.filter(tag => combo.includes(tag)).length;
			const similarity = (matches / Math.max(combo.length, 1)) * 100;
			maxSimilarity = Math.max(maxSimilarity, similarity);
		});

		return Math.min(20, (maxSimilarity / 100) * 20);
	}
}

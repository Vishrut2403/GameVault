import axios from 'axios';
import prisma from '../prisma';

const HLTB_BASE  = 'https://hltbapi.codepotatoes.de';
const STEAM_SEARCH = 'https://store.steampowered.com/api/storesearch';

const SCORING_WEIGHTS = {
	discount:  0.50,
	value:     0.30,
	tagMatch:  0.15,
	rating:    0.05,
};

interface TagProfile {
	[tag: string]: {
		totalPlaytime: number;
		gameCount:     number;
		avgRating:     number;
	};
}

interface HltbResult {
	main:          number;
	extra:         number;
	completionist: number;
	matchedName:   string;
}

interface RecommendationResult {
	id:              string;
	name:            string;
	tags:            string[];
	listPrice:       number;
	currentPrice:    number;
	discountPercent: number;
	finalScore:      number;
	breakdown: {
		discountScore: number;
		valueScore:    number;
		tagMatchScore: number;
		ratingScore:   number;
	};
	hltb: {
		main:          number | null;
		extra:         number | null;
		completionist: number | null;
		matchedName:   string | null;
	};
	estimatedPlaytime: number;
	reasoning:        string[];
}

const hltbCache = new Map<string, HltbResult | null>();

function stringSimilarity(a: string, b: string): number {
	const s1 = a.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
	const s2 = b.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
	if (s1 === s2) return 1;
	const longer  = s1.length > s2.length ? s1 : s2;
	const shorter = s1.length > s2.length ? s2 : s1;
	if (longer.length === 0) return 1;
	const costs: number[] = [];
	for (let i = 0; i <= longer.length; i++) {
		let lastValue = i;
		for (let j = 0; j <= shorter.length; j++) {
			if (i === 0) {
				costs[j] = j;
			} else if (j > 0) {
				let newValue = costs[j - 1];
				if (longer[i - 1] !== shorter[j - 1]) {
					newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
				}
				costs[j - 1] = lastValue;
				lastValue = newValue;
			}
		}
		if (i > 0) costs[shorter.length] = lastValue;
	}
	return (longer.length - costs[shorter.length]) / longer.length;
}

async function resolveAppId(gameName: string): Promise<string | null> {
	try {
		const { data } = await axios.get(STEAM_SEARCH, {
			params: { term: gameName, l: 'en', cc: 'IN' },
			timeout: 8000,
		});

		const items: any[] = data?.items || [];
		const apps = items.filter((i) => i.type === 'app');
		if (apps.length === 0) return null;

		let bestApp   = apps[0];
		let bestScore = stringSimilarity(gameName, apps[0].name);

		for (const app of apps.slice(1)) {
			const score = stringSimilarity(gameName, app.name);
			if (score > bestScore) { bestScore = score; bestApp = app; }
		}

		if (bestScore < 0.5) {
			console.log(`[HLTB Rec] Steam search low confidence "${gameName}" -> "${bestApp.name}" (${bestScore.toFixed(2)})`);
			return null;
		}

		console.log(`[HLTB Rec] Steam resolved "${gameName}" -> "${bestApp.name}" appId=${bestApp.id} (${bestScore.toFixed(2)})`);
		return String(bestApp.id);
	} catch (err: any) {
		console.error(`[HLTB Rec] Steam search failed for "${gameName}":`, err.message);
		return null;
	}
}

async function fetchHltbForWishlistGame(
	gameId:                string,
	gameName:              string,
	existingMain:          number | null,
	existingExtra:         number | null,
	existingCompletionist: number | null,
	existingHltbName:      string | null,
): Promise<HltbResult | null> {

	if (existingCompletionist !== null) {
		return {
			main:          existingMain          ?? 0,
			extra:         existingExtra         ?? 0,
			completionist: existingCompletionist ?? 0,
			matchedName:   existingHltbName      ?? gameName,
		};
	}

	const cacheKey = gameName.toLowerCase();
	if (hltbCache.has(cacheKey)) return hltbCache.get(cacheKey) ?? null;

	try {
		const appId = await resolveAppId(gameName);
		if (!appId) {
			console.log(`[HLTB Rec] Could not resolve Steam appId for "${gameName}"`);
			hltbCache.set(cacheKey, null);
			return null;
		}

		const { data: raw } = await axios.get(`${HLTB_BASE}/steam/${appId}`, { timeout: 8000 });

		const result: HltbResult = {
			main:          raw.mainStory           ?? 0,
			extra:         raw.mainStoryWithExtras ?? 0,
			completionist: raw.completionist       ?? 0,
			matchedName:   raw.title               ?? gameName,
		};

		hltbCache.set(cacheKey, result);

		await prisma.steamWishlist.update({
			where: { id: gameId },
			data: {
				hltbMain:          result.main,
				hltbExtra:         result.extra,
				hltbCompletionist: result.completionist,
				hltbName:          result.matchedName,
			},
		});

		console.log(`[HLTB Rec] "${gameName}" -> ${result.completionist}h completionist`);
		return result;
	} catch (err: any) {
		if (err?.response?.status === 404) {
			console.log(`[HLTB Rec] No HLTB entry for "${gameName}"`);
		} else {
			console.error(`[HLTB Rec] Error for "${gameName}":`, err.message);
		}
		hltbCache.set(cacheKey, null);
		return null;
	}
}

class RecommendationService {
	private async buildTagProfile(userId: string): Promise<TagProfile> {
		const games = await prisma.libraryGame.findMany({
			where: { userId, platform: 'steam', playtimeForever: { gt: 0 } },
			select: { platformData: true, userTags: true, playtimeForever: true, rating: true },
		});

		const profile: TagProfile = {};
		games.forEach((game: any) => {
			const genres  = game.platformData?.genres || [];
			const allTags = [...genres, ...(game.userTags || [])];
			const rating  = game.rating || 3;
			allTags.forEach((tag: string) => {
				if (!profile[tag]) profile[tag] = { totalPlaytime: 0, gameCount: 0, avgRating: 0 };
				const c = profile[tag];
				c.totalPlaytime += game.playtimeForever || 0;
				c.gameCount     += 1;
				c.avgRating      = (c.avgRating * (c.gameCount - 1) + rating) / c.gameCount;
			});
		});

		return profile;
	}

	private calculateDiscountScore(discountPercent: number): number {
		return Math.min(discountPercent, 100);
	}

	private calculateValueScore(
		completionistHours: number | null,
		currentPrice:       number,
		gameTags:           string[],
		profile:            TagProfile,
	): number {
		if (completionistHours && completionistHours > 0 && currentPrice > 0) {
			return Math.min((completionistHours / currentPrice) / 0.1 * 100, 100);
		}
		if (Object.keys(profile).length === 0) return 50;
		let total = 0, count = 0;
		gameTags.forEach((tag) => {
			if (profile[tag]) { total += profile[tag].totalPlaytime; count++; }
		});
		if (count === 0) return 20;
		return Math.min((total / count / 6000) * 100, 100);
	}

	private calculateTagMatchScore(gameTags: string[], profile: TagProfile): number {
		if (Object.keys(profile).length === 0) return 50;
		let matched = 0;
		gameTags.forEach((tag) => { if (profile[tag]) matched++; });
		return gameTags.length > 0 ? (matched / gameTags.length) * 100 : 0;
	}

	private calculateRatingScore(gameTags: string[], profile: TagProfile): number {
		if (Object.keys(profile).length === 0) return 50;
		let total = 0, count = 0;
		gameTags.forEach((tag) => {
			if (profile[tag]) { total += profile[tag].avgRating; count++; }
		});
		return count === 0 ? 40 : (total / count / 5) * 100;
	}

	private generateReasoning(
		discountScore:   number,
		valueScore:      number,
		tagMatchScore:   number,
		discountPercent: number,
		completionist:   number | null,
		currentPrice:    number,
	): string[] {
		const reasons: string[] = [];

		if (discountScore >= 50) reasons.push(`${discountPercent}% discount`);

		if (completionist && completionist > 0 && currentPrice > 0) {
			const ratio = completionist / currentPrice;
			if (ratio >= 0.1)       reasons.push(`${completionist}h for ₹${currentPrice} — great value`);
			else if (ratio >= 0.05) reasons.push(`${completionist}h completionist content`);
		} else if (valueScore > 70) {
			reasons.push('High playtime potential');
		} else if (valueScore > 40) {
			reasons.push('Moderate playtime expected');
		}

		if (tagMatchScore > 70)      reasons.push('Strong tag match');
		else if (tagMatchScore > 40) reasons.push('Decent tag match');

		if (reasons.length === 0) reasons.push('Consider based on price');
		return reasons;
	}

	async getRecommendations(userId: string): Promise<RecommendationResult[]> {
		const wishlistGames = await prisma.steamWishlist.findMany({ where: { userId } });
		if (wishlistGames.length === 0) return [];

		const profile = await this.buildTagProfile(userId);
		hltbCache.clear();

		const recommendations: RecommendationResult[] = [];

		for (const game of wishlistGames) {
			const hltb = await fetchHltbForWishlistGame(
				game.id,
				game.name,
				(game as any).hltbMain          ?? null,
				(game as any).hltbExtra         ?? null,
				(game as any).hltbCompletionist ?? null,
				(game as any).hltbName          ?? null,
			);

			const discountScore = this.calculateDiscountScore(game.discountPercent);
			const valueScore    = this.calculateValueScore(hltb?.completionist ?? null, game.currentPrice, game.tags, profile);
			const tagMatchScore = this.calculateTagMatchScore(game.tags, profile);
			const ratingScore   = this.calculateRatingScore(game.tags, profile);

			const finalScore =
				discountScore * SCORING_WEIGHTS.discount +
				valueScore    * SCORING_WEIGHTS.value    +
				tagMatchScore * SCORING_WEIGHTS.tagMatch +
				ratingScore   * SCORING_WEIGHTS.rating;

			const estimatedPlaytime = hltb?.completionist
				? hltb.completionist * 60
				: (() => {
						let total = 0, count = 0;
						game.tags.forEach((t) => {
							if (profile[t]) { total += profile[t].totalPlaytime / profile[t].gameCount; count++; }
						});
						return count > 0 ? total / count : 600;
					})();

			recommendations.push({
				id:              game.id,
				name:            game.name,
				tags:            game.tags,
				listPrice:       game.listPrice,
				currentPrice:    game.currentPrice,
				discountPercent: game.discountPercent,
				finalScore:      Math.round(finalScore),
				breakdown: {
					discountScore: Math.round(discountScore),
					valueScore:    Math.round(valueScore),
					tagMatchScore: Math.round(tagMatchScore),
					ratingScore:   Math.round(ratingScore),
				},
				hltb: {
					main:          hltb?.main          ?? null,
					extra:         hltb?.extra         ?? null,
					completionist: hltb?.completionist ?? null,
					matchedName:   hltb?.matchedName   ?? null,
				},
				estimatedPlaytime: Math.round(estimatedPlaytime / 60),
				reasoning: this.generateReasoning(
					discountScore, valueScore, tagMatchScore,
					game.discountPercent, hltb?.completionist ?? null, game.currentPrice,
				),
			});
		}

		recommendations.sort((a, b) => b.finalScore - a.finalScore);

		for (const rec of recommendations) {
			await prisma.steamWishlist.update({
				where: { id: rec.id },
				data:  { recommendationScore: rec.finalScore },
			});
		}

		return recommendations;
	}
}

export default new RecommendationService();
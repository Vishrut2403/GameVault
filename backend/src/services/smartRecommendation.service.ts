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

/**
 * Weights for the "reclaim value" ranking. They sum to 75; every game starts at
 * BASE, so scores land between 25 and 100 and the weakest candidate still reads
 * as a number rather than a zero.
 */
const BASE = 25;
const WEIGHT_COST_PER_HOUR = 35;
const WEIGHT_PRICE = 20;
const WEIGHT_REMAINING = 12;
const WEIGHT_ACHIEVEMENT_DENSITY = 8;

/** Hours floor, so a game with no playtime doesn't divide by zero. */
const MIN_HOURS = 0.5;

interface Candidate {
	game: {
		id: string;
		name: string;
		playtimeForever: number | null;
		rating: number | null;
		userTags: string[];
		platform: string;
		pricePaid: number | null;
		achievementsEarned: number | null;
		achievementsTotal: number | null;
	};
	hours: number;
	price: number;
	costPerHour: number;
	remaining: number;
	density: number;
}

/**
 * Scales a value to 0..1 against the range present in the candidate set.
 *
 * Normalising against the candidates rather than fixed thresholds is what keeps
 * the ranking meaningful: the previous scoring used absolute cutoffs on signals
 * that were identical across an all-Steam, untagged library, so every game came
 * out with the same number.
 *
 * When every candidate shares a value the factor carries no information, so it
 * returns 0.5 for all of them rather than an arbitrary winner.
 */
function normalise(value: number, min: number, max: number): number {
	if (!isFinite(value)) return 1;
	if (max === min) return 0.5;
	return (value - min) / (max - min);
}

function formatRupees(amount: number): string {
	return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export class SmartRecommendationService {

	static async getSmartRecommendations(userId: string, limit: number = 5): Promise<GameScore[]> {
		try {
			// Backlog is a deliberate, manually applied mark. Games with no
			// status are simply unplayed and are not candidates.
			const backlog = await prisma.libraryGame.findMany({
				where: { userId, platform: 'steam', status: 'backlog' },
				select: {
					id: true,
					name: true,
					platform: true,
					playtimeForever: true,
					rating: true,
					userTags: true,
					pricePaid: true,
					achievementsEarned: true,
					achievementsTotal: true,
				},
			});

			if (backlog.length === 0) {
				return [];
			}

			const candidates: Candidate[] = backlog.map(game => {
				const hours = (game.playtimeForever || 0) / 60;
				const price = game.pricePaid || 0;
				const total = game.achievementsTotal || 0;
				const earned = game.achievementsEarned || 0;

				return {
					game,
					hours,
					price,
					costPerHour: price / Math.max(hours, MIN_HOURS),
					remaining: total > 0 ? 1 - earned / total : 0,
					density: total,
				};
			});

			const range = (pick: (c: Candidate) => number) => {
				const values = candidates.map(pick).filter(isFinite);
				return { min: Math.min(...values), max: Math.max(...values) };
			};

			const costRange = range(c => c.costPerHour);
			const priceRange = range(c => c.price);
			const remainingRange = range(c => c.remaining);
			const densityRange = range(c => c.density);

			const scored = candidates.map(c => {
				const score =
					BASE +
					WEIGHT_COST_PER_HOUR * normalise(c.costPerHour, costRange.min, costRange.max) +
					WEIGHT_PRICE * normalise(c.price, priceRange.min, priceRange.max) +
					WEIGHT_REMAINING * normalise(c.remaining, remainingRange.min, remainingRange.max) +
					WEIGHT_ACHIEVEMENT_DENSITY * normalise(c.density, densityRange.min, densityRange.max);

				const total = c.game.achievementsTotal || 0;
				const earned = c.game.achievementsEarned || 0;

				return {
					gameId: c.game.id,
					name: c.game.name,
					score: Math.round(Math.min(100, score)),
					reasons: buildReasons(c, earned, total),
					playtimeForever: c.game.playtimeForever || 0,
					rating: c.game.rating,
					userTags: c.game.userTags,
					platform: c.game.platform,
					achievementRate: total > 0 ? earned / total : 0,
				};
			});

			return scored
				.sort((a, b) => b.score - a.score)
				.slice(0, limit);
		} catch (error) {
			console.error('Error in smart recommendations:', error);
			throw error;
		}
	}
}

/** Only the first two are shown in the UI, so the value line comes first. */
function buildReasons(c: Candidate, earned: number, total: number): string[] {
	const reasons: string[] = [];

	if (c.price > 0) {
		if (c.hours < MIN_HOURS) {
			reasons.push(`${formatRupees(c.price)} spent, never played`);
		} else {
			reasons.push(
				`${formatRupees(c.price)} spent over ${c.hours.toFixed(1)}h — ${formatRupees(c.costPerHour)}/hour so far`
			);
		}
	}

	if (total > 0 && earned < total) {
		reasons.push(`${total - earned} of ${total} achievements still to earn`);
	}

	if (reasons.length === 0) {
		reasons.push('In your backlog');
	}

	return reasons;
}

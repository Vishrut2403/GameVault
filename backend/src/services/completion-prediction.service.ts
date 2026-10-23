import { PrismaClient } from '@prisma/client';
import { istDayBucket } from '../utils/dates';

const HABIT_WINDOW_DAYS = 30;

/**
 * Gaming habits over a window of IST days: how long you play on the days you
 * play, and the share of days you play at all. Sessions are one row per game
 * per day, so a day spent on two games still counts as one play day.
 */
export function gamingHabits(sessions: { date: Date; minutes: number }[], windowDays = HABIT_WINDOW_DAYS) {
	const playDays = new Set(sessions.map(s => s.date.getTime())).size;
	if (playDays === 0) {
		// No recent play to learn from: assume 2h a day, every day.
		return { minutesPerPlayDay: 120, playDayRatio: 1 };
	}
	const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
	return { minutesPerPlayDay: totalMinutes / playDays, playDayRatio: Math.min(1, playDays / windowDays) };
}

/** Recommended hours a play day, in half-hour steps and never under 30 minutes. */
export function recommendedPaceMinutes(minutesPerPlayDay: number): number {
	return Math.max(30, Math.round(minutesPerPlayDay / 30) * 30);
}

interface UserPlaystyle {
	avgCompletionRate: number; // 0-1
	avgPlaytimePerGame: number; // minutes
	avgDaysToComplete: number; // days
	genrePlaystyles: Record<string, { completionRate: number; avgDaysToComplete: number }>;
	totalCompletedGames: number;
	totalPlayedGames: number;
}

interface PredictionResult {
	estimatedDays: number;
	estimatedCompletionDate: string;
	confidence: number; // 0-1
	reasoning: string;
	hltbEstimate?: number; // minutes
	hoursPlayed: number;
	hoursRemaining: number;
	estimatedTotalHours: number;
	avgHoursPerDay: number;
	playDaysPerWeek: number;
}

export class CompletionPredictionService {
	constructor(private prisma: PrismaClient) {}

	async getUserPlaystyle(userId: string): Promise<UserPlaystyle> {
		// Get all completed games with their session data
		const completedGames = await this.prisma.libraryGame.findMany({
			where: {
				userId,
				platform: 'steam',
				status: 'completed',
				playtimeForever: { gt: 0 },
			},
			include: {
				sessions: true,
			},
		});

		// Get all played games (any with playtime)
		const playedGames = await this.prisma.libraryGame.findMany({
			where: {
				userId,
				platform: 'steam',
				playtimeForever: { gt: 0 },
			},
		});

		if (completedGames.length === 0) {
			return {
				avgCompletionRate: 0.5, // Assume 50% default
				avgPlaytimePerGame: 60 * 20, // 20 hours
				avgDaysToComplete: 30,
				genrePlaystyles: {},
				totalCompletedGames: 0,
				totalPlayedGames: playedGames.length,
			};
		}

		// Calculate overall metrics
		const totalPlaytime = completedGames.reduce((sum, g) => sum + (g.playtimeForever || 0), 0);
		const avgPlaytimePerGame = totalPlaytime / completedGames.length;

		// Days from first to last session per completed game, from the sessions
		// loaded above. The genre pass below reuses these instead of querying again.
		const daysSpentByGame = new Map<string, number>();
		for (const game of completedGames) {
			if (game.sessions && game.sessions.length > 0) {
				const sessions = game.sessions.sort((a, b) => a.date.getTime() - b.date.getTime());
				const firstSession = sessions[0].date;
				const lastSession = sessions[sessions.length - 1].date;
				daysSpentByGame.set(game.id, Math.max(1, (lastSession.getTime() - firstSession.getTime()) / (1000 * 60 * 60 * 24)));
			}
		}
		const daysToCompleteList = [...daysSpentByGame.values()];

		const avgDaysToComplete = daysToCompleteList.length > 0
			? daysToCompleteList.reduce((a, b) => a + b, 0) / daysToCompleteList.length
			: 30; // Default 30 days

		// Calculate completion rate
		const avgCompletionRate = completedGames.length / playedGames.length;

		// Build genre-specific playstyles
		const genrePlaystyles: Record<string, { completionRate: number; avgDaysToComplete: number }> = {};
		const genreStats: Record<string, { completed: number; total: number; days: number[] }> = {};

		for (const game of playedGames) {
			const tags = game.userTags || [];
			const gameGenres = tags.length > 0 ? tags : ['general'];

			for (const genre of gameGenres) {
				if (!genreStats[genre]) {
					genreStats[genre] = { completed: 0, total: 0, days: [] };
				}
				genreStats[genre].total += 1;

				if (game.status === 'completed') {
					genreStats[genre].completed += 1;
					const daysSpent = daysSpentByGame.get(game.id);
					if (daysSpent !== undefined) {
						genreStats[genre].days.push(daysSpent);
					}
				}
			}
		}

		// Calculate genre-specific averages
		for (const genre in genreStats) {
			const stats = genreStats[genre];
			genrePlaystyles[genre] = {
				completionRate: stats.total > 0 ? stats.completed / stats.total : 0.5,
				avgDaysToComplete: stats.days.length > 0
					? stats.days.reduce((a, b) => a + b, 0) / stats.days.length
					: avgDaysToComplete,
			};
		}

		return {
			avgCompletionRate,
			avgPlaytimePerGame,
			avgDaysToComplete,
			genrePlaystyles,
			totalCompletedGames: completedGames.length,
			totalPlayedGames: playedGames.length,
		};
	}

	async predictCompletion(
		userId: string,
		gameId: string,
		hltbCompletionistMinutes?: number,
	): Promise<PredictionResult> {
		try {
			const game = await this.prisma.libraryGame.findUnique({
				where: { id: gameId },
			});

			if (!game || game.userId !== userId) {
				throw new Error('Game not found');
			}

			const playstyle = await this.getUserPlaystyle(userId);

			const currentPlaytimeMinutes = game.playtimeForever || 0;

			const windowStart = istDayBucket(new Date(Date.now() - (HABIT_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000));
			const recentSessions = await this.prisma.gameSession.findMany({
				where: { userId, date: { gte: windowStart } },
				select: { date: true, minutes: true },
			});
			const habits = gamingHabits(recentSessions);
			// Recommend a normal gaming day's worth for this game, then spread the
			// play days over the calendar at the rate you actually play.
			const paceMinutes = recommendedPaceMinutes(habits.minutesPerPlayDay);
			const avgMinutesPerDay = habits.minutesPerPlayDay * habits.playDayRatio;
			const paceHoursVal = paceMinutes / 60;
			const playDaysPerWeekVal = Math.round(habits.playDayRatio * 7 * 10) / 10;

			// Determine base estimate
			let estimatedTotalMinutes = hltbCompletionistMinutes || (playstyle.avgPlaytimePerGame * 1.2);
			let confidence = 0.5;
			let reasoning = 'Based on your average playtime';

			// If we have HLTB data, use it directly - it's more reliable than user averages
			if (hltbCompletionistMinutes) {
				estimatedTotalMinutes = hltbCompletionistMinutes;
				confidence = 0.85;
				reasoning = 'Based on HLTB estimates';
			}

			// Check if game has tags - boost confidence if genre matches, but don't override HLTB
			if (game.userTags && game.userTags.length > 0 && !hltbCompletionistMinutes) {
				const genrePlaystyle = playstyle.genrePlaystyles[game.userTags[0]];
				if (genrePlaystyle && genrePlaystyle.avgDaysToComplete > 0) {
					// Only use genre estimate if we don't have HLTB data
					const genreAvgPlaytime = (genrePlaystyle.avgDaysToComplete * avgMinutesPerDay);
					estimatedTotalMinutes = genreAvgPlaytime;
					confidence = 0.8;
					reasoning = `Based on your ${game.userTags[0]} playstyle`;
				}
			}

			// If playtime exceeds estimate, adjust estimate upward and recalculate
			if (currentPlaytimeMinutes > estimatedTotalMinutes) {
				estimatedTotalMinutes = currentPlaytimeMinutes * 1.2;
				reasoning = 'Adjusted based on your actual playtime (exceeds estimate)';
				confidence = 0.6; // Lower confidence since estimate was exceeded
			}

			// Calculate remaining time
			let remainingMinutes = Math.max(0, estimatedTotalMinutes - currentPlaytimeMinutes);

			// Boost confidence if already started
			if (currentPlaytimeMinutes > 0 && estimatedTotalMinutes > 0) {
				confidence = Math.min(0.95, confidence + 0.15);
				const progressPercent = Math.min(100, (currentPlaytimeMinutes / estimatedTotalMinutes) * 100);
				reasoning += ` (${progressPercent.toFixed(0)}% progress)`;
			}

			// Handle case where game is actually completed
			if (remainingMinutes <= 0 && game.status === 'completed') {
				const hoursPlayedVal = currentPlaytimeMinutes > 0 ? Math.round((currentPlaytimeMinutes / 60) * 10) / 10 : 0;
				const estimatedTotalHoursVal = estimatedTotalMinutes > 0 ? Math.round((estimatedTotalMinutes / 60) * 10) / 10 : 0;
				return {
					estimatedDays: 0,
					estimatedCompletionDate: new Date().toISOString().split('T')[0],
					confidence: 0.95,
					reasoning: 'Game is marked as completed',
					hltbEstimate: hltbCompletionistMinutes,
					hoursPlayed: hoursPlayedVal,
					hoursRemaining: 0,
					estimatedTotalHours: estimatedTotalHoursVal,
					avgHoursPerDay: paceHoursVal,
					playDaysPerWeek: playDaysPerWeekVal,
				};
			}

			// Calculate estimated days to complete remaining time
			const playDaysNeeded = Math.ceil(remainingMinutes / paceMinutes);
			const estimatedDays = Math.max(1, Math.ceil(playDaysNeeded / habits.playDayRatio));

			// Calculate estimated completion date
			const completionDate = new Date();
			completionDate.setDate(completionDate.getDate() + estimatedDays);

			// Calculate hour values with safety checks
			const hoursPlayedVal = currentPlaytimeMinutes > 0 ? Math.round((currentPlaytimeMinutes / 60) * 10) / 10 : 0;
			const hoursRemainingVal = remainingMinutes > 0 ? Math.round((remainingMinutes / 60) * 10) / 10 : 0;
			const estimatedTotalHoursVal = estimatedTotalMinutes > 0 ? Math.round((estimatedTotalMinutes / 60) * 10) / 10 : 0;

			return {
				estimatedDays,
				estimatedCompletionDate: completionDate.toISOString().split('T')[0],
				confidence: Math.min(1, Math.max(0, confidence)), // Clamp 0-1
				reasoning,
				hltbEstimate: hltbCompletionistMinutes,
				hoursPlayed: hoursPlayedVal,
				hoursRemaining: hoursRemainingVal,
				estimatedTotalHours: estimatedTotalHoursVal,
				avgHoursPerDay: paceHoursVal,
				playDaysPerWeek: playDaysPerWeekVal,
			};
		} catch (error) {
			console.error('[Prediction] Error predicting completion:', error);
			throw error;
		}
	}
}

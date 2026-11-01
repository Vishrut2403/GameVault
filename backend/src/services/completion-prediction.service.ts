import { PrismaClient } from '@prisma/client';
import { istDayBucket } from '../utils/dates';
import { hltbBySteamAppId } from './hltb.service';

const HABIT_WINDOW_DAYS = 30;

/** Play habits over the window; a day with several games counts once. */
export function gamingHabits(sessions: { date: Date; minutes: number }[], windowDays = HABIT_WINDOW_DAYS) {
	const playDays = new Set(sessions.map(s => s.date.getTime())).size;
	if (playDays === 0) {
		// No recent play to learn from: assume 2h a day, every day.
		return { minutesPerPlayDay: 120, playDayRatio: 1 };
	}
	const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
	return { minutesPerPlayDay: totalMinutes / playDays, playDayRatio: Math.min(1, playDays / windowDays) };
}

export type GamingHabits = ReturnType<typeof gamingHabits>;

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

const DAY_MS = 24 * 60 * 60 * 1000;

export interface BacklogGame {
	gameId: string;
	name: string;
	imageUrl: string | null;
	remainingMinutes: number;
}

export interface PlannedGame extends BacklogGame {
	finishDate: string; // IST calendar date, YYYY-MM-DD
}

/** Finish dates, shortest game first, at the user's pace and play frequency. */
export function scheduleBacklog(games: BacklogGame[], habits: GamingHabits, now: Date): PlannedGame[] {
	const pace = recommendedPaceMinutes(habits.minutesPerPlayDay);
	const today = istDayBucket(now).getTime();
	let minutes = 0;
	return [...games]
		.sort((a, b) => a.remainingMinutes - b.remainingMinutes)
		.map((game) => {
			minutes += game.remainingMinutes;
			const calendarDays = Math.ceil(Math.ceil(minutes / pace) / habits.playDayRatio);
			return { ...game, finishDate: new Date(today + calendarDays * DAY_MS).toISOString().slice(0, 10) };
		});
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

	/** The user's gaming habits over the last HABIT_WINDOW_DAYS IST days. */
	async loadHabits(userId: string): Promise<GamingHabits> {
		const windowStart = istDayBucket(new Date(Date.now() - (HABIT_WINDOW_DAYS - 1) * DAY_MS));
		const recentSessions = await this.prisma.gameSession.findMany({
			where: { userId, date: { gte: windowStart } },
			select: { date: true, minutes: true },
		});
		return gamingHabits(recentSessions);
	}

	/** Finish date per backlog game from HLTB main story; games HLTB lacks are listed apart. */
	async planBacklog(userId: string) {
		const backlog = await this.prisma.libraryGame.findMany({
			where: { userId, platform: 'steam', status: 'backlog' },
			select: { id: true, name: true, imageUrl: true, platformGameId: true, playtimeForever: true },
		});
		const habits = await this.loadHabits(userId);

		const known: BacklogGame[] = [];
		const withoutHltb: { gameId: string; name: string }[] = [];
		// A few lookups at a time, so a large backlog's first plan doesn't wait on them one by one.
		for (let i = 0; i < backlog.length; i += 4) {
			const batch = backlog.slice(i, i + 4);
			const times = await Promise.all(batch.map((game) => hltbBySteamAppId(game.platformGameId).catch(() => null)));
			batch.forEach((game, k) => {
				const mainHours = times[k]?.gameplayMain ?? 0;
				if (mainHours > 0) {
					known.push({
						gameId: game.id,
						name: game.name,
						imageUrl: game.imageUrl,
						remainingMinutes: Math.max(0, Math.round(mainHours * 60) - (game.playtimeForever || 0)),
					});
				} else {
					withoutHltb.push({ gameId: game.id, name: game.name });
				}
			});
		}

		return {
			paceHours: recommendedPaceMinutes(habits.minutesPerPlayDay) / 60,
			playDaysPerWeek: Math.round(habits.playDayRatio * 7 * 10) / 10,
			plan: scheduleBacklog(known, habits, new Date()),
			withoutHltb,
		};
	}

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

		// Reused by the genre pass below instead of re-querying.
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

			const habits = await this.loadHabits(userId);
			// A full play day for this game, spread at the user's play frequency.
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

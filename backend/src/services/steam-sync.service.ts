import prisma from '../prisma';
import steamService from './steam.service';
import { sessionTrackingService } from './session-tracking.service';
import type { SteamGame } from './steam.service';

interface SyncOptions {
	/**
	 * Attribute every session recorded by this sync to this day, instead of to
	 * each game's own Steam `rtime_last_played`.
	 *
	 * The midnight job passes the day that just ended. Steam reports only a
	 * running playtime total, so a sync can attribute the minutes gained since
	 * the previous sync but cannot say when within that window they were
	 * played. Running at midnight makes the window line up with one IST day, so
	 * the whole delta belongs to that day — including a session still in
	 * progress, whose minutes after midnight are picked up by the next run and
	 * land on the next day.
	 *
	 * Interactive syncs leave this unset and fall back to `rtime_last_played`,
	 * which is more accurate when a sync is days late.
	 */
	sessionDate?: Date;
}

export async function syncSteamLibrary(steamId: string, options: SyncOptions = {}) {
	const library = await steamService.getUserLibrary(steamId);
	const user = await prisma.user.findUnique({ where: { steamId } });

	let sessionsTracked = 0;

	if (user) {
		for (const steamGame of library) {
			try {
				const existingGame = await prisma.libraryGame.findUnique({
					where: {
						userId_platformGameId_platform: {
							userId: user.id,
							platformGameId: String(steamGame.appid),
							platform: 'steam',
						},
					},
				});

				const newPlaytime = steamGame.playtime_forever || 0;

				if (!existingGame || newPlaytime <= 0) {
					continue;
				}

				const oldPlaytime = existingGame.playtimeForever || 0;

				if (newPlaytime > oldPlaytime) {
					await sessionTrackingService.trackSession({
						userId: user.id,
						gameId: existingGame.id,
						platform: 'steam',
						newPlaytimeMinutes: newPlaytime,
						oldPlaytimeMinutes: oldPlaytime,
						sessionDate: options.sessionDate ?? lastPlayedAt(steamGame),
					});
					sessionsTracked++;
				}
			} catch (error) {
				console.error(`Failed to track session for ${steamGame.name}:`, error);
			}
		}
	}

	await steamService.saveLibrary(steamId, library);

	return { count: library.length, sessionsTracked, games: library };
}

function lastPlayedAt(steamGame: SteamGame): Date | undefined {
	const rtime = (steamGame as any).rtime_last_played;
	return rtime ? new Date(rtime * 1000) : undefined;
}

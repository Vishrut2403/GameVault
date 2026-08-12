import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../prisma';
import { syncSteamLibrary } from '../services/steam-sync.service';
import { previousIstDayBucket } from '../utils/dates';

const router = Router();

/**
 * Constant-time secret comparison.
 *
 * `timingSafeEqual` throws when the buffers differ in length, which would leak
 * the secret's length through the error path, so length is folded into the
 * comparison result instead of short-circuiting on it.
 */
function secretMatches(provided: string, expected: string): boolean {
	const a = Buffer.from(provided);
	const b = Buffer.from(expected);
	if (a.length !== b.length) {
		// Still burn a comparison so the timing does not reveal the mismatch.
		crypto.timingSafeEqual(a, a);
		return false;
	}
	return crypto.timingSafeEqual(a, b);
}

/**
 * Closes out the previous IST day for every user with a linked Steam account.
 *
 * Triggered by an external scheduler rather than an in-process timer: on hosts
 * that idle a free service to sleep, a timer inside this process simply would
 * not fire. An inbound request wakes the service and then does the work.
 */
router.post('/daily-sync', async (req: Request, res: Response) => {
	const expected = process.env.CRON_SECRET;

	if (!expected) {
		console.error('[cron] CRON_SECRET is not set; refusing to run daily sync');
		res.status(503).json({ success: false, error: 'Scheduled sync is not configured' });
		return;
	}

	const provided = req.get('x-cron-secret');

	if (!provided || !secretMatches(provided, expected)) {
		res.status(401).json({ success: false, error: 'Unauthorized' });
		return;
	}

	// The day that just ended, so a run delayed past midnight still attributes
	// to the correct day.
	const sessionDate = previousIstDayBucket(new Date());

	try {
		const users = await prisma.user.findMany({
			where: { steamId: { not: null } },
			select: { id: true, steamId: true },
		});

		let synced = 0;
		let failed = 0;
		let sessionsTracked = 0;

		for (const user of users) {
			try {
				const result = await syncSteamLibrary(user.steamId as string, { sessionDate });
				sessionsTracked += result.sessionsTracked;
				synced++;
			} catch (error) {
				// One user's failure must not abort the rest of the run.
				failed++;
				console.error(`[cron] Steam sync failed for user ${user.id}:`, error);
			}
		}

		const day = sessionDate.toISOString().slice(0, 10);
		console.log(`[cron] Daily sync for ${day}: ${synced} synced, ${failed} failed, ${sessionsTracked} sessions recorded`);

		res.json({ success: true, day, synced, failed, sessionsTracked });
	} catch (error) {
		console.error('[cron] Daily sync failed:', error);
		res.status(500).json({ success: false, error: 'Daily sync failed' });
	}
});

export default router;

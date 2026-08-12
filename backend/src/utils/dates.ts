// Play sessions are bucketed by India Standard Time calendar days, not UTC.
// IST is UTC+5:30 and observes no daylight saving, so a fixed offset is exact.
//
// A bucket is stored as UTC midnight of the IST calendar date it represents.
// Storing it that way means `date.toISOString().slice(0, 10)` yields the IST
// date directly, so the heatmap can label days without re-deriving the offset.
// Storing the true IST midnight instant (18:30 UTC the day before) would make
// every consumer of that column read back the wrong date.
const IST_OFFSET_MINUTES = 5 * 60 + 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** UTC midnight stamped with the IST calendar date that `instant` falls on. */
export function istDayBucket(instant: Date): Date {
	const shifted = new Date(instant.getTime() + IST_OFFSET_MINUTES * 60_000);
	return new Date(
		Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())
	);
}

/**
 * The IST day immediately before the one `instant` falls on.
 *
 * The midnight job uses this to close out the day that just ended. Deriving it
 * from the current IST day rather than subtracting a fixed duration keeps the
 * result correct when the scheduler fires late — a run at 00:05 or at 01:40 IST
 * both attribute to the same previous day.
 */
export function previousIstDayBucket(instant: Date): Date {
	return new Date(istDayBucket(instant).getTime() - MS_PER_DAY);
}

/** The IST calendar date of `instant` as `YYYY-MM-DD`. */
export function istDateString(instant: Date): string {
	return istDayBucket(instant).toISOString().slice(0, 10);
}

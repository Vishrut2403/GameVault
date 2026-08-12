// The backend buckets play sessions by India Standard Time calendar days and
// labels each one `YYYY-MM-DD`. The heatmap grid must be built with the same
// definition of "day", or the squares drift out of alignment with the data —
// most visibly between 00:00 and 05:30 IST, when the UTC date is still
// yesterday's.
const IST_OFFSET_MINUTES = 5 * 60 + 30;

/** The IST calendar date of `instant` as `YYYY-MM-DD`. */
export function istDateString(instant: Date): string {
	const shifted = new Date(instant.getTime() + IST_OFFSET_MINUTES * 60_000);
	return shifted.toISOString().slice(0, 10);
}

/**
 * Day of week for a `YYYY-MM-DD` label, 0 = Sunday.
 *
 * Parsed as UTC so the answer depends only on the date itself. Using
 * `new Date(dateStr).getDay()` would read the viewer's local timezone and
 * shift the whole heatmap by a day for anyone west of UTC.
 */
export function dayOfWeek(dateStr: string): number {
	return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

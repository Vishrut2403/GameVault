import { test } from 'node:test';
import assert from 'node:assert/strict';
import { istDayBucket, previousIstDayBucket, istDateString } from './dates';

// IST is UTC+5:30, so 18:30 UTC is midnight IST.
const utc = (iso: string) => new Date(`${iso}Z`);

test('a session after midnight IST belongs to the new IST day, not the UTC one', () => {
	// 02:15 IST on 23 Oct is still 22 Oct in UTC.
	assert.equal(istDayBucket(utc('2026-10-22T20:45:00')).toISOString(), '2026-10-23T00:00:00.000Z');
});

test('a late-evening IST session stays on that IST day', () => {
	// 23:30 IST on 22 Oct.
	assert.equal(istDayBucket(utc('2026-10-22T18:00:00')).toISOString(), '2026-10-22T00:00:00.000Z');
});

test('the midnight job closes the day that just ended, even when it runs late', () => {
	for (const ran of ['2026-10-22T18:35:00', '2026-10-22T20:10:00']) { // 00:05 and 01:40 IST
		assert.equal(previousIstDayBucket(utc(ran)).toISOString(), '2026-10-22T00:00:00.000Z', `run at ${ran}Z`);
	}
});

test('istDateString labels an instant with its IST date', () => {
	assert.equal(istDateString(utc('2026-12-31T19:00:00')), '2027-01-01');
});

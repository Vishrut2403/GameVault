import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gamingHabits, recommendedPaceMinutes, scheduleBacklog } from './completion-prediction.service';

const day = (n: number) => new Date(Date.UTC(2026, 9, n));

test('gamingHabits averages over play days, counting a day with two games once', () => {
	const habits = gamingHabits([
		{ date: day(1), minutes: 120 },
		{ date: day(1), minutes: 60 },
		{ date: day(2), minutes: 180 },
		{ date: day(5), minutes: 180 },
	]);
	assert.equal(habits.minutesPerPlayDay, 180);
	assert.equal(habits.playDayRatio, 3 / 30);
});

test('gamingHabits assumes 2h a day, every day, with no recent play', () => {
	assert.deepEqual(gamingHabits([]), { minutesPerPlayDay: 120, playDayRatio: 1 });
});

test('recommendedPaceMinutes rounds to half hours and never goes under 30 minutes', () => {
	assert.equal(recommendedPaceMinutes(100), 90);
	assert.equal(recommendedPaceMinutes(170), 180);
	assert.equal(recommendedPaceMinutes(10), 30);
});

test('scheduleBacklog plays shortest first and spreads play days over the calendar', () => {
	const game = (gameId: string, remainingMinutes: number) => ({ gameId, name: gameId, imageUrl: null, remainingMinutes });
	// 02:15 IST on 23 Oct: still 22 Oct in UTC, so this also checks the IST day is used.
	const now = new Date('2026-10-22T20:45:00Z');
	// 3h on days played, every other day.
	const plan = scheduleBacklog([game('long', 600), game('short', 120), game('done', 0)], { minutesPerPlayDay: 180, playDayRatio: 0.5 }, now);

	assert.deepEqual(plan.map((p) => [p.gameId, p.finishDate]), [
		['done', '2026-10-23'],  // nothing left: today
		['short', '2026-10-25'], // 2h → 1 play day → 2 calendar days
		['long', '2026-10-31'],  // 12h so far → 4 play days → 8 calendar days
	]);
});

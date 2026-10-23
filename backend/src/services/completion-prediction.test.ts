import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gamingHabits, recommendedPaceMinutes } from './completion-prediction.service';

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

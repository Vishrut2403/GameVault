import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildYear, heatClass, toWeeks, monthLabels, currentStreak, weekRecap, type DayActivity } from './heatmap';

const NOW = new Date(2026, 9, 23, 15, 0); // 23 Oct 2026, mid-afternoon local time
const at = (date: string) => `${date}T00:00:00.000Z`; // how the server stamps an IST day
const day = (date: string, count: number, hours = count): DayActivity => ({ date, count, hours, games: [] });
const weekday = (date: string) => new Date(`${date}T00:00`).getDay();

test('buildYear covers the 365 days ending today and sums hours per game', () => {
	const days = buildYear([
		{ date: at('2026-10-20'), minutes: 90, game: { name: 'Hades II' } },
		{ date: at('2026-10-20'), minutes: 30, game: { name: 'Celeste' } },
		{ date: at('2026-10-20'), minutes: 30, game: { name: 'Hades II' } },
		{ date: at('2024-01-01'), minutes: 600, game: { name: 'Out of range' } },
	], NOW);

	assert.equal(days.length, 365);
	assert.equal(days[0].date, '2025-10-24');
	assert.equal(days.at(-1)!.date, '2026-10-23');

	const played = days.find(d => d.date === '2026-10-20')!;
	assert.equal(played.count, 2);
	assert.equal(played.hours, 2.5);
	assert.deepEqual(played.games, [{ name: 'Hades II', hours: 2 }, { name: 'Celeste', hours: 0.5 }]);
	assert.equal(days.filter(d => d.count > 0).length, 1);
});

test('heatClass shades by hours played, not games played', () => {
	assert.match(heatClass(day('2026-10-01', 0, 0)), /nb-heat-0/);
	assert.match(heatClass(day('2026-10-01', 3, 0.5)), /nb-heat-1/);
	assert.match(heatClass(day('2026-10-01', 1, 1)), /nb-heat-2/);
	assert.match(heatClass(day('2026-10-01', 1, 2.9)), /nb-heat-2/);
	assert.match(heatClass(day('2026-10-01', 1, 3)), /nb-heat-3/);
});

test('toWeeks puts every day in its own weekday row', () => {
	const days = buildYear([], NOW);
	const weeks = toWeeks(days);

	assert.ok(weeks.every(w => w.length === 7));
	weeks.forEach(week => week.forEach((d, row) => {
		if (d.date) assert.equal(weekday(d.date), row, `${d.date} should be in row ${row}`);
	}));
	assert.deepEqual(weeks.flat().filter(d => d.date).map(d => d.date), days.map(d => d.date));
});

test('monthLabels sit on the first column of each month and never crowd', () => {
	const weeks = toWeeks(buildYear([], NOW));
	const labels = monthLabels(weeks);
	const firstMonth = (i: number) => new Date(`${weeks[i].find(d => d.date)!.date}T00:00`).toLocaleDateString('en-US', { month: 'short' });

	assert.equal(labels.length, weeks.length);
	const placed = labels.flatMap((label, i) => (label ? [i] : []));
	assert.ok(placed.length >= 11, `expected a label for most months, got ${placed.length}`);
	for (const i of placed) {
		assert.equal(labels[i], firstMonth(i));
		if (i > 0) assert.notEqual(firstMonth(i - 1), labels[i], `${labels[i]} should start at column ${i}`);
	}
	// The year opens on 24 Oct: October's one-column stub gives way to November.
	assert.equal(labels[placed[0]], 'Nov');
	placed.slice(1).forEach((col, k) => assert.ok(col - placed[k] >= 3, 'labels closer than 3 columns'));
});

test('currentStreak counts back from yesterday while today is still empty', () => {
	const days = [day('2026-10-18', 0), day('2026-10-19', 1), day('2026-10-20', 1), day('2026-10-21', 2), day('2026-10-22', 1), day('2026-10-23', 0)];
	assert.equal(currentStreak(days), 4);
});

test('currentStreak includes today once it has play, and stops at a gap', () => {
	assert.equal(currentStreak([day('2026-10-20', 1), day('2026-10-21', 0), day('2026-10-22', 1), day('2026-10-23', 1)]), 2);
	assert.equal(currentStreak([day('2026-10-22', 0), day('2026-10-23', 0)]), 0);
});

test('weekRecap sums the last 7 days per game and compares with the week before', () => {
	const played = (date: string, games: [string, number][]): DayActivity =>
		({ date, count: games.length, hours: games.reduce((t, [, h]) => t + h, 0), games: games.map(([name, hours]) => ({ name, hours })) });
	const days = [
		played('2026-10-10', [['Celeste', 4]]), // the week before
		...Array.from({ length: 6 }, (_, i) => day(`2026-10-1${i + 1}`, 0)),
		played('2026-10-17', [['Hades II', 2], ['Celeste', 1]]),
		day('2026-10-18', 0),
		played('2026-10-19', [['Hades II', 1.5]]),
		day('2026-10-20', 0), day('2026-10-21', 0), day('2026-10-22', 0), day('2026-10-23', 0),
	];
	assert.deepEqual(weekRecap(days), {
		hours: 4.5,
		previousHours: 4,
		daysPlayed: 2,
		games: 2,
		topGame: { name: 'Hades II', hours: 3.5 },
	});
	assert.equal(weekRecap(days.slice(-7).map(d => ({ ...d, count: 0, hours: 0, games: [] }))).topGame, null);
});

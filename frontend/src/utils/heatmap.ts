// Heatmap logic, kept out of React so it can be tested.

export interface DayActivity {
	date: string;
	count: number;
	hours: number;
	games: { name: string; hours: number }[];
}

export interface SessionRow {
	date: string;
	minutes: number;
	game?: { name: string };
}

const blankDay = (): DayActivity => ({ date: '', count: 0, hours: 0, games: [] });

const localDateString = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

/** 365 days ending today; session dates are UTC midnight of their IST day. */
export function buildYear(sessions: SessionRow[], now: Date): DayActivity[] {
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const currentDate = new Date(today);
	currentDate.setDate(today.getDate() - 364);

	const days: DayActivity[] = [];
	for (let i = 0; i < 365; i++) {
		days.push({ date: localDateString(currentDate), count: 0, hours: 0, games: [] });
		currentDate.setDate(currentDate.getDate() + 1);
	}

	const sessionsByDate = new Map<string, Map<string, number>>();
	sessions.forEach((session) => {
		const dateStr = new Date(session.date).toISOString().split('T')[0];
		const gameName = session.game?.name || 'Unknown Game';
		if (!sessionsByDate.has(dateStr)) {
			sessionsByDate.set(dateStr, new Map());
		}
		const dayGames = sessionsByDate.get(dateStr)!;
		dayGames.set(gameName, (dayGames.get(gameName) || 0) + (session.minutes || 0));
	});

	sessionsByDate.forEach((gamesMap, dateStr) => {
		const dayIndex = days.findIndex(d => d.date === dateStr);
		if (dayIndex === -1) return;

		const gamesList: { name: string; hours: number }[] = [];
		let totalHours = 0;
		gamesMap.forEach((minutes, gameName) => {
			const hours = Math.round((minutes / 60) * 10) / 10;
			totalHours += hours;
			gamesList.push({ name: gameName, hours });
		});

		days[dayIndex] = {
			date: dateStr,
			count: gamesList.length,
			hours: Math.round(totalHours * 10) / 10,
			games: gamesList.sort((a, b) => b.hours - a.hours)
		};
	});

	return days;
}

/** Shade by hours played that day, not by how many games were played. */
export function heatClass(day: DayActivity): string {
	if (day.count === 0) return 'bg-raised nb-heat-0';
	if (day.hours < 1) return 'bg-ok/40 nb-heat-1';
	if (day.hours < 3) return 'bg-ok/60 nb-heat-2';
	return 'bg-ok-hi nb-heat-3';
}

/** Sunday-to-Saturday columns, padded with blank days so every column has 7. */
export function toWeeks(days: DayActivity[]): DayActivity[][] {
	const result: DayActivity[][] = [];
	let currentWeek: DayActivity[] = [];

	// Parse as local midnight; a bare YYYY-MM-DD parses as UTC and can land on the previous local day.
	const firstDayOfWeek = days[0] ? new Date(`${days[0].date}T00:00`).getDay() : 0;
	for (let i = 0; i < firstDayOfWeek; i++) {
		currentWeek.push(blankDay());
	}

	days.forEach((day) => {
		currentWeek.push(day);
		if (currentWeek.length === 7) {
			result.push(currentWeek);
			currentWeek = [];
		}
	});

	if (currentWeek.length > 0) {
		while (currentWeek.length < 7) currentWeek.push(blankDay());
		result.push(currentWeek);
	}

	return result;
}

/** One label slot per week column; a stub first month gives way to the next. */
export function monthLabels(weeks: DayActivity[][]): string[] {
	const labels: string[] = weeks.map(() => '');
	let currentMonth = '';
	let lastLabelled = -Infinity;

	weeks.forEach((week, weekIndex) => {
		const firstValidDay = week.find(d => d.date !== '');
		if (!firstValidDay) return;
		const monthName = new Date(`${firstValidDay.date}T00:00`).toLocaleDateString('en-US', { month: 'short' });
		if (monthName === currentMonth) return;
		currentMonth = monthName;
		if (weekIndex - lastLabelled < 3) labels[lastLabelled] = '';
		labels[weekIndex] = monthName;
		lastLabelled = weekIndex;
	});

	return labels;
}

/** Played-day streak; an empty today is skipped, as sessions arrive at midnight. */
export function currentStreak(days: DayActivity[]): number {
	const reversed = [...days].reverse();
	if (reversed[0]?.count === 0) reversed.shift();

	let streak = 0;
	for (const day of reversed) {
		if (day.count === 0) break;
		streak++;
	}
	return streak;
}

export interface WeekRecap {
	hours: number;
	previousHours: number;
	daysPlayed: number;
	games: number;
	topGame: { name: string; hours: number } | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The last 7 days against the 7 before them: hours, days played, games and the most-played one. */
export function weekRecap(days: DayActivity[]): WeekRecap {
	const week = days.slice(-7);
	const totalHours = (span: DayActivity[]) => round1(span.reduce((sum, d) => sum + d.hours, 0));

	const hoursByGame = new Map<string, number>();
	week.forEach(d => d.games.forEach(g => hoursByGame.set(g.name, (hoursByGame.get(g.name) ?? 0) + g.hours)));
	const [top] = [...hoursByGame].sort((a, b) => b[1] - a[1]);

	return {
		hours: totalHours(week),
		previousHours: totalHours(days.slice(-14, -7)),
		daysPlayed: week.filter(d => d.count > 0).length,
		games: hoursByGame.size,
		topGame: top ? { name: top[0], hours: round1(top[1]) } : null,
	};
}

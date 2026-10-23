import { useMemo, useState, useEffect } from 'react';
import type { LibraryGame } from '../../types/games.types';
import  api  from '../../services/api';
import { PlatformBadge } from '../PlatformBadge';

interface AnalyticsDashboardPageProps {
	games: LibraryGame[];
}

interface DayActivity {
	date: string;
	count: number;
	hours: number;
	games: { name: string; hours: number }[];
}

type SortOption = 'mostPlayed' | 'mostAchievements' | 'recentlyPlayed' | 'alphabetical';

/** Title bar shown only in the brutal theme; the dark layout keeps its own heading. */
const WindowBar: React.FC<{ title: string; fill: 'lime' | 'pink' | 'yellow' }> = ({ title, fill }) => (
	<div className={`brutal-only nb-titlebar nb-fill-${fill} flex`}>
		<span aria-hidden="true" className="flex gap-2.5">
			<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
			<svg width="16" height="16" viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" /></svg>
			<svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 8h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
		</span>
		<h3>{title}</h3>
	</div>
);

export const AnalyticsDashboardPage: React.FC<AnalyticsDashboardPageProps> = ({ games }) => {
	const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);
	const [coverSort, setCoverSort] = useState<SortOption>('mostPlayed');
	const [sessionData, setSessionData] = useState<any[]>([]);
	const [refreshKey, setRefreshKey] = useState(0); // Force recalculation
	
	useEffect(() => {
		const fetchSessions = async () => {
			try {
				const startDate = new Date();
				startDate.setFullYear(startDate.getFullYear() - 1);
				const response = await api.get(`/user/sessions?startDate=${startDate.toISOString()}`);
				setSessionData(response.data.sessions || []);
				setRefreshKey(prev => prev + 1); // Force heatmap recalculation
			} catch (err) {
				console.error('Failed to fetch sessions:', err);
			}
		};
		fetchSessions();
	}, [games]); // Refetch when games change (after sync)
	
	const stats = useMemo(() => {
		const totalGames = games.length;
		const totalPlaytime = games.reduce((sum, g) => sum + (g.playtimeForever || 0), 0);
		const totalHours = Math.round(totalPlaytime / 60);
		
		const gamesWithAchievements = games.filter(g => (g.achievementsTotal || 0) > 0);
		const totalAchievements = gamesWithAchievements.reduce((sum, g) => sum + (g.achievementsTotal || 0), 0);
		const earnedAchievements = gamesWithAchievements.reduce((sum, g) => sum + (g.achievementsEarned || 0), 0);
		const achievementRate = totalAchievements > 0 
			? Math.round((earnedAchievements / totalAchievements) * 100) 
			: 0;
		
		const totalSpent = games.reduce((sum, g) => sum + (g.pricePaid || 0), 0);
		const avgPricePerHour = totalHours > 0 ? totalSpent / totalHours : 0;
		
		const completedGames = games.filter(g => g.status === 'completed').length;
		const playingGames = games.filter(g => g.status === 'playing').length;
		const backlogGames = games.filter(g => g.status === 'backlog').length;
		
		return {
			totalGames,
			totalHours,
			totalAchievements,
			earnedAchievements,
			achievementRate,
			totalSpent,
			avgPricePerHour,
			completedGames,
			playingGames,
			backlogGames
		};
	}, [games]);

	const sortedGames = useMemo(() => {
		const sorted = [...games];
		
		switch (coverSort) {
			case 'mostPlayed':
				return sorted.sort((a, b) => (b.playtimeForever || 0) - (a.playtimeForever || 0));
			case 'mostAchievements':
				return sorted.sort((a, b) => (b.achievementsEarned || 0) - (a.achievementsEarned || 0));
			case 'recentlyPlayed':
				return sorted.sort((a, b) => {
					const aTime = a.lastPlayedAt ? new Date(a.lastPlayedAt).getTime() : 0;
					const bTime = b.lastPlayedAt ? new Date(b.lastPlayedAt).getTime() : 0;
					return bTime - aTime;
				});
			case 'alphabetical':
				return sorted.sort((a, b) => a.name.localeCompare(b.name));
			default:
				return sorted;
		}
	}, [games, coverSort]);

	const completionFunnel = useMemo(() => {
		const owned = games.length;
		const started = games.filter(g => (g.playtimeForever || 0) > 0).length;
		const played10h = games.filter(g => (g.playtimeForever || 0) >= 600).length;
		const completed = games.filter(g => g.status === 'completed').length;
		const perfect = games.filter(g => 
			g.achievementsTotal && 
			g.achievementsTotal > 0 && 
			g.achievementsEarned === g.achievementsTotal
		).length;
		
		return [
			{ stage: 'Owned', count: owned, percentage: 100 },
			{ stage: 'Started', count: started, percentage: Math.round((started / owned) * 100) },
			{ stage: 'Played 10h+', count: played10h, percentage: Math.round((played10h / owned) * 100) },
			{ stage: 'Completed', count: completed, percentage: Math.round((completed / owned) * 100) },
			{ stage: '100%', count: perfect, percentage: Math.round((perfect / owned) * 100) }
		];
	}, [games]);
	
	const formatTime = (minutes: number) => {
		const hours = Math.floor(minutes / 60);
		return hours > 0 ? `${hours}h` : `${minutes}m`;
	};

	const heatmapData = useMemo(() => {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		const getLocalDateString = (date: Date): string => {
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			return `${year}-${month}-${day}`;
		};
		
		const startDate = new Date(today);
		startDate.setDate(today.getDate() - 364);

		const days: DayActivity[] = [];
		const currentDate = new Date(startDate);

		for (let i = 0; i < 365; i++) {
			const dateStr = getLocalDateString(currentDate);
			days.push({ date: dateStr, count: 0, hours: 0, games: [] });
			currentDate.setDate(currentDate.getDate() + 1);
		}

		const sessionsByDate = new Map<string, Map<string, number>>();
		
		sessionData.forEach((session) => {
			const dateStr = new Date(session.date).toISOString().split('T')[0];
			const gameName = session.game?.name || 'Unknown Game';
			const minutes = session.minutes || 0;
			
			if (!sessionsByDate.has(dateStr)) {
				sessionsByDate.set(dateStr, new Map());
			}
			
			const dayGames = sessionsByDate.get(dateStr)!;
			const currentMinutes = dayGames.get(gameName) || 0;
			dayGames.set(gameName, currentMinutes + minutes);
		});

		sessionsByDate.forEach((gamesMap, dateStr) => {
			const dayIndex = days.findIndex(d => d.date === dateStr);
			if (dayIndex !== -1) {
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
			} else {
			}
		});

		return days;
	}, [sessionData, refreshKey]);

	// Shade by hours played that day, not by how many games were played.
	const getColor = (day: DayActivity): string => {
		if (day.count === 0) return 'bg-raised nb-heat-0';
		if (day.hours < 1) return 'bg-ok/40 nb-heat-1';
		if (day.hours < 3) return 'bg-ok/60 nb-heat-2';
		return 'bg-ok-hi nb-heat-3';
	};

	const weeks = useMemo(() => {
		const result: DayActivity[][] = [];
		let currentWeek: DayActivity[] = [];
		
		// Parse as local midnight; a bare YYYY-MM-DD parses as UTC and can land on the previous local day.
		const firstDay = heatmapData[0] ? new Date(`${heatmapData[0].date}T00:00`) : new Date();
		const firstDayOfWeek = firstDay.getDay();
		
		for (let i = 0; i < firstDayOfWeek; i++) {
			currentWeek.push({ date: '', count: 0, hours: 0, games: [] });
		}

		heatmapData.forEach((day) => {
			currentWeek.push(day);
			
			if (currentWeek.length === 7) {
				result.push([...currentWeek]);
				currentWeek = [];
			}
		});

		while (currentWeek.length > 0 && currentWeek.length < 7) {
			currentWeek.push({ date: '', count: 0, hours: 0, games: [] });
		}
		if (currentWeek.length === 7) {
			result.push(currentWeek);
		}

		return result;
	}, [heatmapData]);

	// One label slot per week column, filled where a new month starts. A label
	// closer than 3 columns to the previous one is dropped so the two don't overlap.
	const monthLabels = useMemo(() => {
		const labels: string[] = weeks.map(() => '');
		let currentMonth = '';
		let lastLabelled = -Infinity;

		weeks.forEach((week, weekIndex) => {
			const firstValidDay = week.find(d => d.date !== '');
			if (!firstValidDay) return;
			const monthName = new Date(`${firstValidDay.date}T00:00`).toLocaleDateString('en-US', { month: 'short' });
			if (monthName === currentMonth) return;
			currentMonth = monthName;
			if (weekIndex - lastLabelled < 3) return;
			labels[weekIndex] = monthName;
			lastLabelled = weekIndex;
		});

		return labels;
	}, [weeks]);

	const totalActivity = useMemo(() => {
		return heatmapData.reduce((sum, day) => sum + day.count, 0);
	}, [heatmapData]);

	const activeStreak = useMemo(() => {
		let streak = 0;
		const reversedData = [...heatmapData].reverse();
		// Sessions are recorded by the midnight sync, so today is usually still
		// empty; count back from yesterday then instead of reporting 0.
		if (reversedData[0]?.count === 0) reversedData.shift();
		
		for (const day of reversedData) {
			if (day.count > 0) {
				streak++;
			} else {
				break;
			}
		}
		
		return streak;
	}, [heatmapData]);

	return (
		<div className="space-y-8">
			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<div className="nb-stat nb-fill-yellow bg-panel  rounded-lg p-6 border border-line shadow-lg">
					<p className="text-sm text-muted font-semibold mb-2">Total Games</p>
					<p className="text-4xl font-bold text-ink">{stats.totalGames}</p>
					<p className="brutal-only nb-chip">in your library</p>
				</div>

				<div className="nb-stat nb-fill-pink bg-panel  rounded-lg p-6 border border-line shadow-lg">
					<p className="text-sm text-muted font-semibold mb-2">Total Playtime</p>
					<p className="text-4xl font-bold text-accent-hi-fg">{stats.totalHours}h</p>
					<p className="brutal-only nb-chip">≈ {stats.totalGames > 0 ? (stats.totalHours / stats.totalGames).toFixed(1) : 0}h per game</p>
				</div>

				<div className="nb-stat nb-fill-lime bg-panel  rounded-lg p-6 border border-line shadow-lg">
					<p className="text-sm text-muted font-semibold mb-2">Achievement Rate</p>
					<p className="text-4xl font-bold text-ok-fg">{stats.achievementRate}%</p>
					<p className="brutal-only nb-chip">{stats.earnedAchievements.toLocaleString()} unlocked</p>
				</div>

				<div className="nb-stat nb-fill-violet bg-panel  rounded-lg p-6 border border-line shadow-lg">
					<p className="text-sm text-muted font-semibold mb-2">Completed Games</p>
					<p className="text-4xl font-bold text-highlight-fg">{stats.completedGames}</p>
					<p className="brutal-only nb-chip">{completionFunnel[4].count} at 100%</p>
				</div>
			</div>

			{/* Gaming Activity Heatmap */}
			<section className="nb-window bg-panel  rounded-lg p-6 border border-line shadow-lg">
				<WindowBar title="Gaming Activity" fill="lime" />
				<div className="nb-body">
				<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
					<div>
						<h3 className="dark-only text-2xl font-bold text-ink mb-2">Gaming Activity</h3>
						<p className="text-sm text-muted">Click any day for details</p>
					</div>
					<div className="brutal-only flex flex-wrap gap-3">
						<span className="nb-fill-yellow flex items-center gap-2 px-3 py-1.5 rounded-lg border border-line font-bold">
							<span className="nb-num" style={{ fontSize: 22 }}>{totalActivity}</span> sessions
						</span>
						<span className="nb-fill-pink flex items-center gap-2 px-3 py-1.5 rounded-lg border border-line font-bold">
							<span className="nb-num" style={{ fontSize: 22 }}>{activeStreak}</span> day streak
						</span>
					</div>
					<div className="dark-only text-right">
						<p className="text-sm text-muted">Total Sessions</p>
						<p className="text-2xl font-bold text-ink">{totalActivity}</p>
						<p className="text-xs text-faint mt-1">
							Current Streak: {activeStreak} {activeStreak === 1 ? 'day' : 'days'}
						</p>
					</div>
				</div>

				<div className="overflow-x-auto pb-4">
					<div className="inline-block min-w-full">
						{/* Month Labels: same column widths and gaps as the grid below, so each label sits over its week */}
						<div className="flex gap-1 mb-2">
							<div className="w-8 shrink-0" />
							<div className="flex gap-1">
								{monthLabels.map((label, idx) => (
									<div key={idx} className="w-3 shrink-0 overflow-visible whitespace-nowrap text-xs text-muted font-medium">
										{label}
									</div>
								))}
							</div>
						</div>

						{/* Day Labels + Grid */}
						<div className="flex gap-1">
							{/* Day of week labels */}
							<div className="w-8 shrink-0 flex flex-col gap-1 text-xs text-muted">
								<div className="h-3"></div>
								<div className="h-3">Mon</div>
								<div className="h-3"></div>
								<div className="h-3">Wed</div>
								<div className="h-3"></div>
								<div className="h-3">Fri</div>
								<div className="h-3"></div>
							</div>

							{/* Heatmap Grid */}
							<div className="flex gap-1">
								{weeks.map((week, weekIdx) => (
									<div key={weekIdx} className="flex flex-col gap-1">
										{week.map((day, dayIdx) => (
											<div
												key={dayIdx}
												className={`w-3 h-3 rounded-sm cursor-pointer transition-all duration-200 ${
													day.date ? `nb-heat ${getColor(day)}` : 'bg-transparent'
												} ${day.count > 0 ? 'hover:ring-2 hover:ring-accent-line hover:scale-125' : ''}`}
												onClick={() => day.count > 0 && setSelectedDay(day)}
												title={day.date ? `${day.date}: ${day.count} game${day.count !== 1 ? 's' : ''}, ${day.hours}h` : ''}
											/>
										))}
									</div>
								))}
							</div>
						</div>

						{/* Legend */}
						<div className="flex items-center gap-3 mt-6 text-xs text-muted">
							<span>Less</span>
							<div className="w-3 h-3 rounded-sm nb-heat bg-raised nb-heat-0" title="No play"></div>
							<div className="w-3 h-3 rounded-sm nb-heat bg-ok/40 nb-heat-1" title="Under 1h"></div>
							<div className="w-3 h-3 rounded-sm nb-heat bg-ok/60 nb-heat-2" title="1–3h"></div>
							<div className="w-3 h-3 rounded-sm nb-heat bg-ok-hi nb-heat-3" title="3h or more"></div>
							<span>More</span>
						</div>
					</div>
				</div>
				</div>
			</section>

			{/* Day Detail Modal */}
			{selectedDay && (
				<div className="fixed inset-0 bg-black/60  flex items-center justify-center z-50 p-4" onClick={() => setSelectedDay(null)}>
					<div className="bg-panel  rounded-lg p-6 border border-line shadow-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="text-xl font-bold text-ink">{new Date(selectedDay.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
								<p className="text-sm text-muted mt-1">
									{selectedDay.count} game{selectedDay.count !== 1 ? 's' : ''} • {selectedDay.hours}h total
								</p>
							</div>
							<button onClick={() => setSelectedDay(null)} className="text-muted hover:text-ink text-2xl">×</button>
						</div>

						<div className="space-y-4">
							{selectedDay.games.map((game, idx) => (
								<div key={idx} className="bg-surface  rounded-lg p-4 border border-line">
									<div className="flex items-center justify-between">
										<p className="text-ink font-medium">{game.name}</p>
										<p className="text-ok-fg font-semibold">{game.hours}h</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{/* Game Cover Wall */}
			<section className="nb-window bg-surface border border-line rounded-lg p-6">
				<WindowBar title="Game Cover Wall" fill="pink" />
				<div className="nb-body">
				<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
					<h3 className="dark-only text-xl font-bold text-ink">Game Cover Wall</h3>
					<div className="flex flex-wrap gap-2" role="group" aria-label="Sort covers">
						<button
							onClick={() => setCoverSort('mostPlayed')}
							aria-pressed={coverSort === 'mostPlayed'}
							className={`nb-btn nb-raise px-4 py-2 rounded-lg text-sm font-medium transition-all ${
								coverSort === 'mostPlayed'
									? 'bg-accent/20 border border-accent-line text-accent-hi-fg'
									: 'bg-surface/50 border border-line/50 text-muted hover:text-ink'
							}`}
						>
							Most Played
						</button>
						<button
							onClick={() => setCoverSort('mostAchievements')}
							aria-pressed={coverSort === 'mostAchievements'}
							className={`nb-btn nb-raise px-4 py-2 rounded-lg text-sm font-medium transition-all ${
								coverSort === 'mostAchievements'
									? 'bg-accent/20 border border-accent-line text-accent-hi-fg'
									: 'bg-surface/50 border border-line/50 text-muted hover:text-ink'
							}`}
						>
							Most Achievements
						</button>
						<button
							onClick={() => setCoverSort('recentlyPlayed')}
							aria-pressed={coverSort === 'recentlyPlayed'}
							className={`nb-btn nb-raise px-4 py-2 rounded-lg text-sm font-medium transition-all ${
								coverSort === 'recentlyPlayed'
									? 'bg-accent/20 border border-accent-line text-accent-hi-fg'
									: 'bg-surface/50 border border-line/50 text-muted hover:text-ink'
							}`}
						>
							Recently Played
						</button>
					</div>
				</div>
				
				<div className="nb-cover-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
					{sortedGames.slice(0, 48).map((game, idx) => {
						const achievementPercent = game.achievementsTotal && game.achievementsTotal > 0
							? Math.round(((game.achievementsEarned || 0) / game.achievementsTotal) * 100)
							: null;
						
						return (
							<div 
								key={idx} 
								className="nb-tile group relative aspect-[460/215] overflow-hidden rounded-lg border border-line hover:border-accent-line transition-all"
								title={game.name}
							>
								{game.imageUrl ? (
									<img 
										src={game.imageUrl} 
										alt={game.name}
										className="w-full h-full object-cover group-hover:scale-105 transition-transform"
									/>
								) : (
									<div className="w-full h-full bg-gradient-to-br from-raised to-surface flex items-center justify-center">
										<span className="text-faint text-3xl">🎮</span>
									</div>
								)}
								
								<div className="brutal-only absolute left-2 bottom-2 flex gap-1.5">
									<span className="nb-chip">{formatTime(game.playtimeForever || 0)}</span>
									{achievementPercent !== null && achievementPercent > 0 && (
										<span className="nb-chip nb-chip-dark">{achievementPercent}%</span>
									)}
								</div>

								{/* Overlay with info */}
								<div className="dark-only absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
									<div className="text-ink text-xs font-semibold mb-1 line-clamp-2">
										{game.name}
									</div>
									<div className="flex items-center justify-between text-xs text-muted">
										<span>{formatTime(game.playtimeForever || 0)}</span>
										{achievementPercent !== null && achievementPercent > 0 && (
											<span>{achievementPercent}%</span>
										)}
									</div>
									<PlatformBadge platform={game.platform} showLabel={false} />
								</div>
							</div>
						);
					})}
				</div>
				</div>
			</section>
			
			{/* Completion Funnel */}
			<section className="nb-window bg-surface border border-line rounded-lg p-6">
				<WindowBar title="Completion Funnel" fill="yellow" />
				<div className="nb-body">
				<h3 className="dark-only text-xl font-bold text-ink mb-6">Completion Funnel</h3>
				<div className="space-y-6">
					{completionFunnel.map((stage, idx) => {
						const color = `var(--funnel-${idx})`;
						
						return (
							<div key={idx} className="relative">
								<div className="flex items-center justify-between mb-2">
									<span className="text-ink font-medium">{stage.stage}</span>
									<span className="text-muted text-sm">
										{stage.count} games ({stage.percentage}%)
									</span>
								</div>
								<div className="nb-track h-12 bg-raised rounded-lg overflow-hidden">
									<div 
										className="nb-bar h-full flex items-center justify-start px-4 text-ink font-semibold transition-all duration-500"
										style={{ 
											width: `${stage.percentage}%`,
											backgroundColor: color,
											minWidth: stage.count > 0 ? '60px' : '0'
										}}
									>
										{stage.count}
									</div>
								</div>
							</div>
						);
					})}
				</div>
				</div>
			</section>
			
			{/* Stats Summary */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="nb-summary nb-fill-violet bg-surface border border-line rounded-lg p-6">
					<div className="dark-only text-3xl mb-2">✅</div>
					<span className="brutal-only w-15 h-15 shrink-0 flex items-center justify-center rounded-full border border-line bg-surface" aria-hidden="true">
						<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
					</span>
					<div>
						<div className="nb-num text-2xl font-bold text-ink mb-1">
							{Math.round((completionFunnel[3].count / games.length) * 100)}%
						</div>
						<div className="nb-label text-sm text-muted">Completion Rate</div>
					</div>
				</div>
				
				<div className="nb-summary nb-fill-cyan bg-surface border border-line rounded-lg p-6">
					<div className="dark-only text-3xl mb-2">📦</div>
					<span className="brutal-only w-15 h-15 shrink-0 flex items-center justify-center rounded-full border border-line bg-surface" aria-hidden="true">
						<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></svg>
					</span>
					<div>
						<div className="nb-num text-2xl font-bold text-ink mb-1">
							{games.filter(g => g.status === 'backlog').length}
						</div>
						<div className="nb-label text-sm text-muted">Backlog Games</div>
					</div>
				</div>
			</div>
		</div>
	);
};
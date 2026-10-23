import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

	const backlogEvolution = useMemo(() => {
		const months = [];
		const totalGames = games.length;
		const completedGames = games.filter(g => g.status === 'completed').length;
		
		for (let i = 11; i >= 0; i--) {
			const date = new Date();
			date.setMonth(date.getMonth() - i);
			const monthName = date.toLocaleDateString('default', { month: 'short' });
			
			const owned = Math.round(totalGames * (0.5 + (i / 24)));
			const completed = Math.round(completedGames * (0.3 + (i / 36)));
			const backlog = owned - completed;
			
			months.push({
				month: monthName,
				owned,
				completed,
				backlog
			});
		}
		
		return months;
	}, [games]);
	
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

	const getColor = (count: number): string => {
		if (count === 0) return 'bg-[#2a2a2a]';
		if (count === 1) return 'bg-[#5a8a6a]/40';
		if (count === 2) return 'bg-[#5a8a6a]/60';
		if (count >= 3) return 'bg-[#7aaa8a]';
		return 'bg-[#2a2a2a]';
	};

	const weeks = useMemo(() => {
		const result: DayActivity[][] = [];
		let currentWeek: DayActivity[] = [];
		
		const firstDay = new Date(heatmapData[0]?.date || new Date());
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

	const months = useMemo(() => {
		const monthLabels: { label: string; weekIndex: number }[] = [];
		let currentMonth = '';

		weeks.forEach((week, weekIndex) => {
			const firstValidDay = week.find(d => d.date !== '');
			if (firstValidDay) {
				const firstDay = new Date(firstValidDay.date);
				const monthName = firstDay.toLocaleDateString('en-US', { month: 'short' });
				
				if (monthName !== currentMonth) {
					monthLabels.push({ label: monthName, weekIndex });
					currentMonth = monthName;
				}
			}
		});

		return monthLabels;
	}, [weeks]);

	const totalActivity = useMemo(() => {
		return heatmapData.reduce((sum, day) => sum + day.count, 0);
	}, [heatmapData]);

	const activeStreak = useMemo(() => {
		let streak = 0;
		const reversedData = [...heatmapData].reverse();
		
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
				<div className="bg-[#000000]  rounded-lg p-6 border border-[#333333] shadow-lg">
					<p className="text-sm text-[#a0a0a0] font-semibold mb-2">Total Games</p>
					<p className="text-4xl font-bold text-[#e5e5e5]">{stats.totalGames}</p>
				</div>

				<div className="bg-[#000000]  rounded-lg p-6 border border-[#333333] shadow-lg">
					<p className="text-sm text-[#a0a0a0] font-semibold mb-2">Total Playtime</p>
					<p className="text-4xl font-bold text-[#7a9fc3]">{stats.totalHours}h</p>
				</div>

				<div className="bg-[#000000]  rounded-lg p-6 border border-[#333333] shadow-lg">
					<p className="text-sm text-[#a0a0a0] font-semibold mb-2">Achievement Rate</p>
					<p className="text-4xl font-bold text-[#7aaa8a]">{stats.achievementRate}%</p>
				</div>

				<div className="bg-[#000000]  rounded-lg p-6 border border-[#333333] shadow-lg">
					<p className="text-sm text-[#a0a0a0] font-semibold mb-2">Completed Games</p>
					<p className="text-4xl font-bold text-purple-400">{stats.completedGames}</p>
				</div>
			</div>

			{/* Gaming Activity Heatmap */}
			<div className="bg-[#000000]  rounded-lg p-6 border border-[#333333] shadow-lg">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h3 className="text-2xl font-bold text-[#e5e5e5] mb-2">Gaming Activity</h3>
						<p className="text-sm text-[#a0a0a0]">Click any day for details</p>
					</div>
					<div className="text-right">
						<p className="text-sm text-[#a0a0a0]">Total Sessions</p>
						<p className="text-2xl font-bold text-[#e5e5e5]">{totalActivity}</p>
						<p className="text-xs text-[#696969] mt-1">
							Current Streak: {activeStreak} {activeStreak === 1 ? 'day' : 'days'}
						</p>
					</div>
				</div>

				<div className="overflow-x-auto pb-4">
					<div className="inline-block min-w-full">
						{/* Month Labels */}
						<div className="flex mb-2 ml-8">
							{months.map((month, idx) => (
								<div
									key={idx}
									className="text-xs text-[#a0a0a0] font-medium"
									style={{ 
										marginLeft: idx === 0 ? 0 : `${(month.weekIndex - (months[idx - 1]?.weekIndex || 0)) * 14}px`,
										minWidth: '40px'
									}}
								>
									{month.label}
								</div>
							))}
						</div>

						{/* Day Labels + Grid */}
						<div className="flex gap-1">
							{/* Day of week labels */}
							<div className="flex flex-col gap-1 text-xs text-[#a0a0a0] pr-2">
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
													day.date ? getColor(day.count) : 'bg-transparent'
												} ${day.count > 0 ? 'hover:ring-2 hover:ring-blue-400 hover:scale-125' : ''}`}
												onClick={() => day.count > 0 && setSelectedDay(day)}
												title={day.date ? `${day.date}: ${day.count} game${day.count !== 1 ? 's' : ''}, ${day.hours}h` : ''}
											/>
										))}
									</div>
								))}
							</div>
						</div>

						{/* Legend */}
						<div className="flex items-center gap-3 mt-6 text-xs text-[#a0a0a0]">
							<span>Less</span>
							<div className="w-3 h-3 rounded-sm bg-[#2a2a2a]"></div>
							<div className="w-3 h-3 rounded-sm bg-[#5a8a6a]/40"></div>
							<div className="w-3 h-3 rounded-sm bg-[#5a8a6a]/60"></div>
							<div className="w-3 h-3 rounded-sm bg-[#7aaa8a]"></div>
							<span>More</span>
						</div>
					</div>
				</div>
			</div>

			{/* Day Detail Modal */}
			{selectedDay && (
				<div className="fixed inset-0 bg-black/60  flex items-center justify-center z-50 p-4" onClick={() => setSelectedDay(null)}>
					<div className="bg-[#000000]  rounded-lg p-6 border border-[#333333] shadow-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="text-xl font-bold text-[#e5e5e5]">{new Date(selectedDay.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
								<p className="text-sm text-[#a0a0a0] mt-1">
									{selectedDay.count} game{selectedDay.count !== 1 ? 's' : ''} • {selectedDay.hours}h total
								</p>
							</div>
							<button onClick={() => setSelectedDay(null)} className="text-[#a0a0a0] hover:text-[#e5e5e5] text-2xl">×</button>
						</div>

						<div className="space-y-4">
							{selectedDay.games.map((game, idx) => (
								<div key={idx} className="bg-[#1a1a1a]  rounded-lg p-4 border border-[#333333]">
									<div className="flex items-center justify-between">
										<p className="text-[#e5e5e5] font-medium">{game.name}</p>
										<p className="text-[#7aaa8a] font-semibold">{game.hours}h</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{/* Game Cover Wall */}
			<div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
				<div className="flex items-center justify-between mb-6">
					<h3 className="text-xl font-bold text-[#e5e5e5]">Game Cover Wall</h3>
					<div className="flex gap-2">
						<button
							onClick={() => setCoverSort('mostPlayed')}
							className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
								coverSort === 'mostPlayed'
									? 'bg-[#5a7fa3]/20 border border-[#5a7fa3] text-blue-300'
									: 'bg-[#1a1a1a]/50 border border-[#333333]/50 text-[#a0a0a0] hover:text-[#e5e5e5]'
							}`}
						>
							Most Played
						</button>
						<button
							onClick={() => setCoverSort('mostAchievements')}
							className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
								coverSort === 'mostAchievements'
									? 'bg-[#5a7fa3]/20 border border-[#5a7fa3] text-blue-300'
									: 'bg-[#1a1a1a]/50 border border-[#333333]/50 text-[#a0a0a0] hover:text-[#e5e5e5]'
							}`}
						>
							Most Achievements
						</button>
						<button
							onClick={() => setCoverSort('recentlyPlayed')}
							className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
								coverSort === 'recentlyPlayed'
									? 'bg-[#5a7fa3]/20 border border-[#5a7fa3] text-blue-300'
									: 'bg-[#1a1a1a]/50 border border-[#333333]/50 text-[#a0a0a0] hover:text-[#e5e5e5]'
							}`}
						>
							Recently Played
						</button>
					</div>
				</div>
				
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
					{sortedGames.slice(0, 48).map((game, idx) => {
						const achievementPercent = game.achievementsTotal && game.achievementsTotal > 0
							? Math.round(((game.achievementsEarned || 0) / game.achievementsTotal) * 100)
							: null;
						
						return (
							<div 
								key={idx} 
								className="group relative aspect-[460/215] overflow-hidden rounded-lg border border-[#333333] hover:border-[#5a7fa3] transition-all"
							>
								{game.imageUrl ? (
									<img 
										src={game.imageUrl} 
										alt={game.name}
										className="w-full h-full object-cover group-hover:scale-105 transition-transform"
									/>
								) : (
									<div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
										<span className="text-[#696969] text-3xl">🎮</span>
									</div>
								)}
								
								{/* Overlay with info */}
								<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
									<div className="text-[#e5e5e5] text-xs font-semibold mb-1 line-clamp-2">
										{game.name}
									</div>
									<div className="flex items-center justify-between text-xs text-[#a0a0a0]">
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
			
			{/* Backlog Evolution */}
			<div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
				<h3 className="text-xl font-bold text-[#e5e5e5] mb-6">Backlog Evolution</h3>
				<ResponsiveContainer width="100%" height={300}>
					<BarChart data={backlogEvolution}>
						<CartesianGrid strokeDasharray="3 3" stroke="#374151" />
						<XAxis dataKey="month" stroke="#9ca3af" />
						<YAxis stroke="#9ca3af" />
						<Tooltip 
							contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
							labelStyle={{ color: '#f1f5f9' }}
						/>
						<Bar dataKey="owned" fill="#3b82f6" name="Owned" stackId="a" />
						<Bar dataKey="completed" fill="#10b981" name="Completed" stackId="a" />
					</BarChart>
				</ResponsiveContainer>
			</div>
			
			{/* Completion Funnel */}
			<div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
				<h3 className="text-xl font-bold text-[#e5e5e5] mb-6">Completion Funnel</h3>
				<div className="space-y-6">
					{completionFunnel.map((stage, idx) => {
						const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
						const color = colors[idx];
						
						return (
							<div key={idx} className="relative">
								<div className="flex items-center justify-between mb-2">
									<span className="text-[#e5e5e5] font-medium">{stage.stage}</span>
									<span className="text-[#a0a0a0] text-sm">
										{stage.count} games ({stage.percentage}%)
									</span>
								</div>
								<div className="h-12 bg-[#2a2a2a] rounded-lg overflow-hidden">
									<div 
										className="h-full flex items-center justify-start px-4 text-[#e5e5e5] font-semibold transition-all duration-500"
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
			
			{/* Stats Summary */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
					<div className="text-3xl mb-2">📚</div>
					<div className="text-2xl font-bold text-[#e5e5e5] mb-1">
						{games.length}
					</div>
					<div className="text-sm text-[#a0a0a0]">Total Library Size</div>
				</div>
				
				<div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
					<div className="text-3xl mb-2">✅</div>
					<div className="text-2xl font-bold text-[#e5e5e5] mb-1">
						{Math.round((completionFunnel[3].count / games.length) * 100)}%
					</div>
					<div className="text-sm text-[#a0a0a0]">Completion Rate</div>
				</div>
				
				<div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
					<div className="text-3xl mb-2">📦</div>
					<div className="text-2xl font-bold text-[#e5e5e5] mb-1">
						{games.filter(g => g.status === 'backlog').length}
					</div>
					<div className="text-sm text-[#a0a0a0]">Backlog Games</div>
				</div>
			</div>
		</div>
	);
};
import { useMemo, useState, useEffect } from 'react';
import type { LibraryGame } from '../types/games.types';
import { API_BASE_URL } from '../services/api';
import { istDateString, dayOfWeek } from '../utils/dates';

interface GameActivityHeatmapProps {
	games: LibraryGame[];
	userId: string;
}

interface DayActivity {
	date: string;
	hours: number;
	games: string[];
	count: number;
}

/**
 * A year of empty days, ending today and starting on a Sunday.
 *
 * Every column then holds a full week, the way GitHub's contribution graph
 * works. Starting exactly 365 days back instead would leave the first column a
 * ragged stub beginning on whatever weekday happened to fall a year ago.
 */
function buildYearOfDays(): Map<string, DayActivity> {
	const today = new Date();
	const start = new Date(today);
	start.setDate(today.getDate() - 364);
	while (dayOfWeek(istDateString(start)) !== 0) {
		start.setDate(start.getDate() - 1);
	}

	const days = new Map<string, DayActivity>();
	for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
		const dateStr = istDateString(d);
		days.set(dateStr, { date: dateStr, hours: 0, games: [], count: 0 });
	}
	return days;
}

export const GameActivityHeatmap: React.FC<GameActivityHeatmapProps> = ({ games, userId }) => {
	const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);
	const [hoveredDay, setHoveredDay] = useState<DayActivity | null>(null);
	const [activityData, setActivityData] = useState<DayActivity[]>([]);
	const [loading, setLoading] = useState(true);
	
	useEffect(() => {
		const fetchSessions = async () => {
			try {
				const token = localStorage.getItem('token');
				const response = await fetch(`${API_BASE_URL}/api/sessions/daily-activity?days=365`, {
					headers: token ? { Authorization: `Bearer ${token}` } : undefined
				});
				const data = await response.json();
				
				if (data.success) {
					const allDaysMap = buildYearOfDays();

					data.data.forEach((session: DayActivity) => {
						allDaysMap.set(session.date, session);
					});
					
					setActivityData(Array.from(allDaysMap.values()));
				} else {
					setActivityData(generateEstimatedData());
				}
			} catch (error) {
				console.error('Failed to fetch session data:', error);
				setActivityData(generateEstimatedData());
			} finally {
				setLoading(false);
			}
		};
		
		fetchSessions();
	}, [userId, games]);

	const generateEstimatedData = (): DayActivity[] => {
		const activityMap = buildYearOfDays();
		
		games.forEach(game => {
			const lastPlayed = (game as any).lastPlayedAt;
			if (lastPlayed) {
				const dateStr = istDateString(new Date(lastPlayed));
				const activity = activityMap.get(dateStr);
				if (activity) {
					const hoursToAdd = (game.playtimeForever || 0) / 60 / 30;
					activity.hours += hoursToAdd;
					activity.games.push(game.name);
					activity.count++;
				}
			}
		});
		
		return Array.from(activityMap.values());
	};
	
	// GitHub's contribution-graph scale.
	const getColorIntensity = (hours: number): { backgroundColor: string } => {
		if (hours === 0) return { backgroundColor: '#161b22' };
		if (hours < 0.5) return { backgroundColor: '#0e4429' };
		if (hours < 1) return { backgroundColor: '#006d32' };
		if (hours < 2) return { backgroundColor: '#26a641' };
		return { backgroundColor: '#39d353' };
	};
	
	const weeks = useMemo(() => {
		const result: DayActivity[][] = [];
		let currentWeek: DayActivity[] = [];
		
		activityData.forEach((day, idx) => {
			if (dayOfWeek(day.date) === 0 && currentWeek.length > 0) {
				result.push(currentWeek);
				currentWeek = [];
			}
			
			currentWeek.push(day);
			
			if (idx === activityData.length - 1) {
				result.push(currentWeek);
			}
		});
		
		return result;
	}, [activityData]);

	const monthLabels = useMemo(() => {
		const labels: { month: string; col: number }[] = [];
		let lastMonth = -1;
		
		weeks.forEach((week, idx) => {
			const firstDay = week[0];
			if (firstDay) {
				const date = new Date(`${firstDay.date}T00:00:00Z`);
				const month = date.getUTCMonth();

				if (month !== lastMonth) {
					labels.push({
						month: date.toLocaleString('default', { month: 'short', timeZone: 'UTC' }),
						col: idx
					});
					lastMonth = month;
				}
			}
		});
		
		return labels;
	}, [weeks]);

	// Keyed by week column so the header can be rendered as part of the same
	// grid, rather than positioned over it with pixel offsets.
	const monthByCol = useMemo(
		() => new Map(monthLabels.map(l => [l.col, l.month])),
		[monthLabels]
	);

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString('default', { 
			weekday: 'short', 
			year: 'numeric', 
			month: 'short', 
			day: 'numeric' 
		});
	};
	
	const totalHours = activityData.reduce((sum, day) => sum + day.hours, 0);
	const activeDays = activityData.filter(day => day.hours > 0).length;
	const currentStreak = useMemo(() => {
		let streak = 0;
		for (let i = activityData.length - 1; i >= 0; i--) {
			if (activityData[i].hours > 0) {
				streak++;
			} else {
				break;
			}
		}
		return streak;
	}, [activityData]);

	if (loading) {
		return (
			<div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
				<div className="flex items-center justify-center py-8">
					<div className="w-8 h-8 border-4 border-[#2a2a2a] border-t-[#5a7fa3] rounded-full animate-spin" />
					<span className="ml-3 text-[#a0a0a0]">Loading activity data...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
			<div className="mb-6">
				<h3 className="text-xl font-bold text-[#e5e5e5] mb-2">Gaming Activity</h3>
				<div className="flex items-center gap-6 text-sm text-[#a0a0a0]">
					<span>{activeDays} active days in the last year</span>
					<span>{Math.round(totalHours)}h total playtime</span>
					<span>{currentStreak} day current streak</span>
				</div>
			</div>
			
			{/* Heatmap */}
			<div>
				{/* Month labels. These sit in a row built from the same column
				    widths as the grid below — one cell per week — so a label
				    always lands on the week its month starts in. Positioning
				    them absolutely over the grid meant hardcoding the column
				    pitch, which drifted out of step with the squares. */}
				<div className="flex mb-1">
					<div className="w-8 mr-2 shrink-0" />
					<div className="flex gap-[3px]">
						{weeks.map((_, weekIdx) => (
							<div key={weekIdx} className="w-3 h-4 shrink-0 relative">
								{monthByCol.has(weekIdx) && (
									<span className="absolute left-0 top-0 text-xs text-[#696969] whitespace-nowrap">
										{monthByCol.get(weekIdx)}
									</span>
								)}
							</div>
						))}
					</div>
				</div>

				{/* Day labels */}
				<div className="flex">
					<div className="flex flex-col gap-[3px] text-xs text-gray-500 mr-2 w-8 shrink-0">
						<div className="h-3">Mon</div>
						<div className="h-3"></div>
						<div className="h-3">Wed</div>
						<div className="h-3"></div>
						<div className="h-3">Fri</div>
						<div className="h-3"></div>
						<div className="h-3">Sun</div>
					</div>
					
					{/* Calendar grid */}
					<div className="flex gap-[3px]">
						{weeks.map((week, weekIdx) => (
							<div key={weekIdx} className="flex flex-col gap-[3px] w-3 shrink-0">
								{[0, 1, 2, 3, 4, 5, 6].map(weekday => {
									const day = week.find(d => dayOfWeek(d.date) === weekday);

									if (!day) {
										return <div key={weekday} className="w-3 h-3" />;
									}
									
									return (
										<div
											key={day.date}
											className="w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-[#5a7fa3]"
											style={getColorIntensity(day.hours)}
											onMouseEnter={() => setHoveredDay(day)}
											onMouseLeave={() => setHoveredDay(null)}
											onClick={() => setSelectedDay(day)}
											title={`${formatDate(day.date)}: ${day.hours.toFixed(1)}h`}
										/>
									);
								})}
							</div>
						))}
					</div>
				</div>
				
				{/* Legend */}
				<div className="flex items-center gap-2 mt-4 text-xs text-[#696969]">
					<span>Less</span>
				<div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#161b22' }} />
				<div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#0e4429' }} />
				<div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#006d32' }} />
				<div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#26a641' }} />
				<div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#39d353' }} />
					<span>More</span>
				</div>
			</div>
			
			{/* Hover tooltip */}
			{hoveredDay && hoveredDay.hours > 0 && (
				<div className="mt-4 p-4 bg-[#1a1a1a] border border-[#333333] rounded-lg">
					<div className="font-semibold text-[#e5e5e5] mb-1">{formatDate(hoveredDay.date)}</div>
					<div className="text-sm text-[#a0a0a0] mb-2">
						{hoveredDay.hours.toFixed(1)} hours played
					</div>
					{hoveredDay.games.length > 0 && (
						<div className="text-xs text-[#696969]">
							{hoveredDay.games.slice(0, 3).join(', ')}
							{hoveredDay.games.length > 3 && ` +${hoveredDay.games.length - 3} more`}
						</div>
					)}
				</div>
			)}
			
			{/* Detail modal */}
			{selectedDay && selectedDay.hours > 0 && (
				<div 
					className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60"
					onClick={() => setSelectedDay(null)}
				>
					<div 
						className="bg-[#000000] border border-[#333333] rounded-lg p-6 max-w-md w-full"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-xl font-bold text-[#e5e5e5]">{formatDate(selectedDay.date)}</h3>
							<button 
								onClick={() => setSelectedDay(null)}
								className="text-[#a0a0a0] hover:text-[#e5e5e5] text-2xl"
							>
								×
							</button>
						</div>
						
						<div className="mb-4">
							<div className="text-3xl font-bold text-[#7aaa8a]">
								{selectedDay.hours.toFixed(1)} hours
							</div>
							<div className="text-sm text-[#a0a0a0]">
								{selectedDay.count} game{selectedDay.count !== 1 ? 's' : ''} played
							</div>
						</div>
						
						{selectedDay.games.length > 0 && (
							<div>
								<div className="text-sm font-semibold text-[#e5e5e5] mb-2">Games Played:</div>
								<div className="space-y-2">
									{selectedDay.games.map((game, idx) => (
										<div 
											key={idx}
											className="px-3 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg text-sm text-[#e5e5e5]"
										>
											{game}
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
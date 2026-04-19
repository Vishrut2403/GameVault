import { useMemo, useState, useEffect } from 'react';
import type { LibraryGame } from '../types/games.types';

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

export const GameActivityHeatmap: React.FC<GameActivityHeatmapProps> = ({ games, userId }) => {
	const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);
	const [hoveredDay, setHoveredDay] = useState<DayActivity | null>(null);
	const [activityData, setActivityData] = useState<DayActivity[]>([]);
	const [loading, setLoading] = useState(true);
	
	useEffect(() => {
		const fetchSessions = async () => {
			try {
				const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
				const response = await fetch(`${backendUrl}/api/sessions/daily-activity?userId=${userId}&days=365`);
				const data = await response.json();
				
				if (data.success) {
					const today = new Date();
					const oneYearAgo = new Date(today);
					oneYearAgo.setDate(today.getDate() - 365);
					
					const allDaysMap = new Map<string, DayActivity>();

					for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
						const dateStr = d.toISOString().split('T')[0];
						allDaysMap.set(dateStr, {
							date: dateStr,
							hours: 0,
							games: [],
							count: 0
						});
					}
					
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
		const today = new Date();
		const oneYearAgo = new Date(today);
		oneYearAgo.setDate(today.getDate() - 365);
		
		const activityMap = new Map<string, DayActivity>();
		
		for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
			const dateStr = d.toISOString().split('T')[0];
			activityMap.set(dateStr, {
				date: dateStr,
				hours: 0,
				games: [],
				count: 0
			});
		}
		
		games.forEach(game => {
			const lastPlayed = (game as any).lastPlayedAt;
			if (lastPlayed) {
				const dateStr = new Date(lastPlayed).toISOString().split('T')[0];
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
	
	const getColorIntensity = (hours: number): { backgroundColor: string } => {
		if (hours === 0) return { backgroundColor: '#0d1117' };
		if (hours < 0.5) return { backgroundColor: '#0f662a' };
		if (hours < 1) return { backgroundColor: '#1a7f37' };
		if (hours < 2) return { backgroundColor: '#26d07c' };
		return { backgroundColor: '#3fb950' };
	};
	
	const weeks = useMemo(() => {
		const result: DayActivity[][] = [];
		let currentWeek: DayActivity[] = [];
		
		activityData.forEach((day, idx) => {
			const date = new Date(day.date);
			const dayOfWeek = date.getDay();
			
			if (dayOfWeek === 0 && currentWeek.length > 0) {
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
				const date = new Date(firstDay.date);
				const month = date.getMonth();
				
				if (month !== lastMonth) {
					labels.push({
						month: date.toLocaleString('default', { month: 'short' }),
						col: idx
					});
					lastMonth = month;
				}
			}
		});
		
		return labels;
	}, [weeks]);
	
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
			<div className="relative">
				{/* Month labels */}
				<div className="flex gap-[3px] mb-2 ml-8">
					{monthLabels.map((label, idx) => (
						<div 
							key={idx}
							className="text-xs text-[#696969] absolute"
							style={{ left: `${label.col * 15 + 32}px` }}
						>
							{label.month}
						</div>
					))}
				</div>
				
				{/* Day labels */}
				<div className="flex">
					<div className="flex flex-col gap-[3px] text-xs text-gray-500 mr-2 mt-6">
						<div className="h-3">Mon</div>
						<div className="h-3"></div>
						<div className="h-3">Wed</div>
						<div className="h-3"></div>
						<div className="h-3">Fri</div>
						<div className="h-3"></div>
						<div className="h-3">Sun</div>
					</div>
					
					{/* Calendar grid */}
					<div className="flex gap-[3px] mt-6">
						{weeks.map((week, weekIdx) => (
							<div key={weekIdx} className="flex flex-col gap-[3px]">
								{[0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => {
									const day = week.find(d => new Date(d.date).getDay() === dayOfWeek);
									
									if (!day) {
										return <div key={dayOfWeek} className="w-3 h-3" />;
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
				<div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#0d1117' }} />
				<div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#0f662a' }} />
				<div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#1a7f37' }} />
				<div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#26d07c' }} />
				<div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3fb950' }} />
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
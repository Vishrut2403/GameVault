import { useMemo, useState, useEffect } from 'react';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import type { LibraryGame } from '../../types/games.types';
import  api  from '../../services/api';

interface AnalyticsDashboardPageProps {
  games: LibraryGame[];
}

interface DayActivity {
  date: string;
  count: number;
  hours: number;
  games: { name: string; hours: number }[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export const AnalyticsDashboardPage: React.FC<AnalyticsDashboardPageProps> = ({ games }) => {
  const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);
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

  const platformData = useMemo(() => {
    const platformMap = games.reduce((acc, game) => {
      acc[game.platform] = (acc[game.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(platformMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [games]);

  const radarData = useMemo(() => {
    const gamesWithRating = games.filter(g => g.rating);
    const avgRating = gamesWithRating.length > 0
      ? gamesWithRating.reduce((sum, g) => sum + (g.rating || 0), 0) / gamesWithRating.length
      : 0;

    const completionRate = games.length > 0 
      ? (stats.completedGames / games.length) * 100 
      : 0;

    const playtimeScore = Math.min((stats.totalHours / 1000) * 100, 100);
    
    const gamesWithPrice = games.filter(g => g.pricePerHour && g.pricePerHour > 0);
    const avgValue = gamesWithPrice.length > 0
      ? gamesWithPrice.reduce((sum, g) => sum + (g.pricePerHour || 0), 0) / gamesWithPrice.length
      : 0;
    const valueScore = avgValue > 0 ? Math.max(100 - avgValue, 0) : 50;

    return [
      { metric: 'Rating', value: (avgRating / 5) * 100 },
      { metric: 'Completion', value: completionRate },
      { metric: 'Playtime', value: playtimeScore },
      { metric: 'Achievements', value: stats.achievementRate },
      { metric: 'Value', value: valueScore },
    ];
  }, [games, stats]);

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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gaming Profile Radar */}
        <div className="bg-[#000000]  rounded-lg p-6 border border-[#333333] shadow-lg">
          <h3 className="text-xl font-bold text-[#e5e5e5] mb-6">Gaming Profile</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#475569" />
              <PolarAngleAxis dataKey="metric" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} />
              <Radar name="Profile" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                labelStyle={{ color: '#f1f5f9' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Platform Distribution */}
        <div className="bg-[#000000]  rounded-lg p-6 border border-[#333333] shadow-lg">
          <h3 className="text-xl font-bold text-[#e5e5e5] mb-6">Platform Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={platformData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {platformData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
              />
              <Legend 
                wrapperStyle={{ color: '#94a3b8' }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
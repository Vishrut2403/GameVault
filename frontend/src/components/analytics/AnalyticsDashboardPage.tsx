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
  
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        const response = await api.get(`/user/sessions?startDate=${startDate.toISOString()}`);
        setSessionData(response.data.sessions || []);
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
      }
    };
    fetchSessions();
  }, []);
  
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yearAgo = new Date(today);
    yearAgo.setFullYear(today.getFullYear() - 1);
    yearAgo.setDate(yearAgo.getDate() + 1);

    const days: DayActivity[] = [];
    const currentDate = new Date(yearAgo);

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
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
      }
    });

    const daysWithActivity = days.filter(d => d.count > 0).length;

    return days;
  }, [sessionData]);

  const getColor = (count: number): string => {
    if (count === 0) return 'bg-slate-800/30';
    if (count === 1) return 'bg-green-900/50';
    if (count === 2) return 'bg-green-700/70';
    if (count >= 3) return 'bg-green-500';
    return 'bg-slate-800/30';
  };

  const weeks = useMemo(() => {
    const result: DayActivity[][] = [];
    let currentWeek: DayActivity[] = [];
    
    // Start from the first day of the week containing our start date
    const firstDay = new Date(heatmapData[0]?.date || new Date());
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    // Add empty cells for days before our data starts
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

    // Fill remaining days of last week
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
      if (day.count > 0) streak++;
      else break;
    }
    return streak;
  }, [heatmapData]);

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Games</span>
            <span className="text-2xl">🎮</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats.totalGames}</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Playtime</span>
            <span className="text-2xl">⏱️</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats.totalHours}h</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Achievements</span>
            <span className="text-2xl">🏆</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats.achievementRate}%</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.earnedAchievements} / {stats.totalAchievements}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Spent</span>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-3xl font-bold text-white">₹{stats.totalSpent.toFixed(0)}</div>
          <div className="text-xs text-gray-500 mt-1">
            ₹{stats.avgPricePerHour.toFixed(2)}/hour
          </div>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Gaming Activity</h3>
            <p className="text-sm text-gray-400">Click any day for details</p>
          </div>
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{totalActivity}</div>
              <div className="text-gray-400">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{activeStreak}</div>
              <div className="text-gray-400">Day streak</div>
            </div>
          </div>
        </div>

        <div className="mb-2 flex gap-[3px] ml-8">
          {months.map((month, idx) => (
            <div
              key={idx}
              className="text-xs text-gray-400"
              style={{ marginLeft: idx === 0 ? 0 : `${(month.weekIndex - (months[idx - 1]?.weekIndex || 0)) * 15}px` }}
            >
              {month.label}
            </div>
          ))}
        </div>

        <div className="flex gap-[3px] overflow-x-auto">
          <div className="flex flex-col gap-[3px] text-xs text-gray-400 justify-around py-1">
            <div>Mon</div>
            <div>Wed</div>
            <div>Fri</div>
          </div>

          <div className="flex gap-[3px]">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-[3px]">
                {week.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    onClick={() => day.count > 0 && setSelectedDay(day)}
                    className={`w-[12px] h-[12px] rounded-sm ${getColor(day.count)} transition-all hover:ring-2 hover:ring-white/50 ${
                      day.count > 0 ? 'cursor-pointer' : 'cursor-default'
                    } ${day.date === '' ? 'opacity-0' : ''}`}
                    title={day.date ? `${day.date}: ${day.hours}h played` : ''}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-slate-800/30" />
            <div className="w-3 h-3 rounded-sm bg-green-900/50" />
            <div className="w-3 h-3 rounded-sm bg-green-700/70" />
            <div className="w-3 h-3 rounded-sm bg-green-500" />
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Day Details Modal */}
      {selectedDay && selectedDay.date && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDay(null)}
        >
          <div 
            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {new Date(selectedDay.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {selectedDay.hours}h total • {selectedDay.games.length} game{selectedDay.games.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedDay.games.map((game, idx) => (
                <div 
                  key={idx}
                  className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-white">{game.name}</div>
                      <div className="text-sm text-gray-400 mt-1">
                        {game.hours}h played
                      </div>
                    </div>
                    <div className="text-2xl">🎮</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Gaming Profile</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#475569" />
              <PolarAngleAxis dataKey="metric" stroke="#9ca3af" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#9ca3af" />
              <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Platform Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={platformData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {platformData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <div className="text-sm text-gray-400 mb-2">Completed</div>
          <div className="text-3xl font-bold text-green-400">{stats.completedGames}</div>
          <div className="text-xs text-gray-500 mt-1">
            {games.length > 0 ? Math.round((stats.completedGames / games.length) * 100) : 0}% of library
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <div className="text-sm text-gray-400 mb-2">Playing</div>
          <div className="text-3xl font-bold text-blue-400">{stats.playingGames}</div>
          <div className="text-xs text-gray-500 mt-1">
            {games.length > 0 ? Math.round((stats.playingGames / games.length) * 100) : 0}% of library
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <div className="text-sm text-gray-400 mb-2">Backlog</div>
          <div className="text-3xl font-bold text-yellow-400">{stats.backlogGames}</div>
          <div className="text-xs text-gray-500 mt-1">
            {games.length > 0 ? Math.round((stats.backlogGames / games.length) * 100) : 0}% of library
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <div className="text-sm text-gray-400 mb-2">Unplayed</div>
          <div className="text-3xl font-bold text-gray-400">
            {games.length - stats.completedGames - stats.playingGames - stats.backlogGames}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {games.length > 0 
              ? Math.round(((games.length - stats.completedGames - stats.playingGames - stats.backlogGames) / games.length) * 100) 
              : 0}% of library
          </div>
        </div>
      </div>
    </div>
  );
};
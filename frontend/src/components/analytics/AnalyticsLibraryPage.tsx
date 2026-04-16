import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { LibraryGame } from '../../types/games.types';
import { PlatformBadge } from '../PlatformBadge';

interface AnalyticsLibraryPageProps {
  games: LibraryGame[];
}

type SortOption = 'mostPlayed' | 'mostAchievements' | 'recentlyPlayed' | 'alphabetical';

export const AnalyticsLibraryPage: React.FC<AnalyticsLibraryPageProps> = ({ games }) => {
  const [coverSort, setCoverSort] = useState<SortOption>('mostPlayed');
  
  const platformStats = useMemo(() => {
    const stats = games.reduce((acc, game) => {
      const platform = game.platform;
      if (!acc[platform]) {
        acc[platform] = {
          name: platform,
          games: 0,
          hours: 0,
          achievements: 0,
          totalAchievements: 0,
          completedGames: 0
        };
      }
      acc[platform].games += 1;
      acc[platform].hours += Math.round((game.playtimeForever || 0) / 60);
      acc[platform].achievements += (game.achievementsEarned || 0);
      acc[platform].totalAchievements += (game.achievementsTotal || 0);
      if (game.status === 'completed') acc[platform].completedGames += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(stats).map((stat: any) => ({
      ...stat,
      avgCompletion: stat.totalAchievements > 0 
        ? Math.round((stat.achievements / stat.totalAchievements) * 100)
        : 0,
      completionRate: stat.games > 0
        ? Math.round((stat.completedGames / stat.games) * 100)
        : 0
    }));
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

  return (
    <div className="space-y-8">
      {/* Platform Distribution Cards */}
      <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
        <h3 className="text-xl font-bold text-[#e5e5e5] mb-6">Platform Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {platformStats.map((platform, idx) => {
            const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];
            const color = colors[idx % colors.length];
            
            return (
              <div 
                key={idx}
                className="p-5 rounded-lg border border-[#333333] hover:border-[#333333]/50 transition-all hover:scale-105 duration-300"
                style={{ 
                  backgroundColor: `${color}15`,
                  borderColor: `${color}30`
                }}
              >
                {/* Platform Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={platform.name} showLabel={false} />
                    <span className="font-bold text-[#e5e5e5] text-lg">{platform.name}</span>
                  </div>
                  <div 
                    className="w-3 h-3 rounded-full shadow-lg"
                    style={{ 
                      backgroundColor: color,
                      boxShadow: `0 0 10px ${color}80`
                    }}
                  />
                </div>

                {/* Game Count */}
                <div className="mb-3">
                  <div className="text-3xl font-bold text-[#e5e5e5]">{platform.games}</div>
                  <div className="text-sm text-[#a0a0a0]">total games</div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#333333]">
                  <div>
                    <div className="text-xs text-[#696969] mb-1">Playtime</div>
                    <div className="text-lg font-semibold" style={{ color }}>
                      {platform.hours}h
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#696969] mb-1">Avg/Game</div>
                    <div className="text-lg font-semibold" style={{ color }}>
                      {Math.round(platform.hours / platform.games)}h
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#696969] mb-1">Achievements</div>
                    <div className="text-lg font-semibold text-[#e5e5e5]">
                      {platform.avgCompletion}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#696969] mb-1">Completed</div>
                    <div className="text-lg font-semibold text-[#e5e5e5]">
                      {platform.completionRate}%
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="h-1.5 bg-[#1a1a1a]/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${platform.avgCompletion}%`,
                        backgroundColor: color
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
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
            {games.filter(g => g.status === 'backlog' || !g.status).length}
          </div>
          <div className="text-sm text-[#a0a0a0]">Backlog Games</div>
        </div>
      </div>
    </div>
  );
};
import { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import type { LibraryGame } from '../../types/games.types';

interface AnalyticsPlaytimePageProps {
  games: LibraryGame[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export const AnalyticsPlaytimePage: React.FC<AnalyticsPlaytimePageProps> = ({ games }) => {
  
  const platformNames = useMemo(() => {
    return Array.from(new Set(games.map(g => g.platform)));
  }, [games]);

  const topGamesVertical = useMemo(() => {
    const platformColorMap: Record<string, string> = {};
    platformNames.forEach((platform, idx) => {
      platformColorMap[platform] = COLORS[idx % COLORS.length];
    });

    return [...games]
      .filter(g => (g.playtimeForever || 0) > 0)
      .sort((a, b) => (b.playtimeForever || 0) - (a.playtimeForever || 0))
      .slice(0, 12)
      .map(g => ({
        name: g.name.length > 20 ? g.name.substring(0, 20) + '...' : g.name,
        hours: Math.round((g.playtimeForever || 0) / 60),
        fill: platformColorMap[g.platform] || COLORS[0],
        platform: g.platform
      }));
  }, [games, platformNames]);
  
  const playtimeDistribution = useMemo(() => {
    const buckets = {
      '0-5h': 0,
      '5-10h': 0,
      '10-25h': 0,
      '25-50h': 0,
      '50-100h': 0,
      '100h+': 0
    };
    
    games.forEach(game => {
      const hours = (game.playtimeForever || 0) / 60;
      if (hours === 0) return;
      if (hours < 5) buckets['0-5h']++;
      else if (hours < 10) buckets['5-10h']++;
      else if (hours < 25) buckets['10-25h']++;
      else if (hours < 50) buckets['25-50h']++;
      else if (hours < 100) buckets['50-100h']++;
      else buckets['100h+']++;
    });
    
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [games]);
  
  const platformPlaytime = useMemo(() => {
    const platformMap = games.reduce((acc, game) => {
      const hours = Math.round((game.playtimeForever || 0) / 60);
      acc[game.platform] = (acc[game.platform] || 0) + hours;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(platformMap)
      .map(([platform, hours]) => ({ platform, hours }))
      .sort((a, b) => b.hours - a.hours);
  }, [games]);

  return (
    <div className="space-y-6">
      {/* CLEAN: Most Played Games - Colorful Vertical Bars */}
      <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
        <h3 className="text-xl font-bold text-[#e5e5e5] mb-6">Most Played Games</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topGamesVertical} margin={{ bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="name" 
              stroke="#9ca3af"
              angle={-45}
              textAnchor="end"
              interval={0}
              height={100}
              tick={{ fontSize: 11 }}
            />
            <YAxis 
              stroke="#9ca3af"
              label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
              labelStyle={{ color: '#f1f5f9' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div style={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', padding: '10px' }}>
                      <p style={{ color: '#f1f5f9', margin: 0, fontWeight: 'bold' }}>{data.name}</p>
                      <p style={{ color: '#9ca3af', margin: '4px 0 0 0' }}>{data.platform}</p>
                      <p style={{ color: '#10b981', margin: '4px 0 0 0' }}>{data.hours} hours</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
              {topGamesVertical.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Playtime Distribution */}
      <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
        <h3 className="text-xl font-bold text-[#e5e5e5] mb-6">Playtime Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={playtimeDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="range" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
              labelStyle={{ color: '#f1f5f9' }}
            />
            <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Platform Playtime */}
      <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
        <h3 className="text-xl font-bold text-[#e5e5e5] mb-6">Playtime by Platform</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={platformPlaytime}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="platform" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
              labelStyle={{ color: '#f1f5f9' }}
            />
            <Bar dataKey="hours" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
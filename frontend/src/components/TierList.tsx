import { useMemo } from 'react';
import type { LibraryGame } from '../types/games.types';

interface TierListProps {
  games: LibraryGame[];
}

type Tier = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

interface TierData {
  tier: Tier;
  games: LibraryGame[];
  color: string;
  bgColor: string;
  label: string;
}

export const TierList: React.FC<TierListProps> = ({ games }) => {
  
  const getTier = (rating: number | null | undefined): Tier => {
    if (!rating || rating === 0) return 'F';
    if (rating === 5) return 'S';  
    if (rating === 4) return 'A'; 
    if (rating === 3) return 'B';  
    if (rating === 2) return 'C';  
    if (rating === 1) return 'D';  
    return 'F';
  };

  const tierData: TierData[] = useMemo(() => {
    const tiers: Record<Tier, LibraryGame[]> = {
      'S': [],
      'A': [],
      'B': [],
      'C': [],
      'D': [],
      'F': []
    };

    // Only include games that have been rated
    const ratedGames = games.filter(g => g.rating && g.rating > 0);
    
    ratedGames.forEach(game => {
      const tier = getTier(game.rating);
      tiers[tier].push(game);
    });

    return [
      {
        tier: 'S',
        games: tiers.S.sort((a, b) => (b.playtimeForever || 0) - (a.playtimeForever || 0)),
        color: '#ff4757',
        bgColor: '#ff475720',
        label: 'Masterpiece (5 ⭐)'
      },
      {
        tier: 'A',
        games: tiers.A.sort((a, b) => (b.playtimeForever || 0) - (a.playtimeForever || 0)),
        color: '#ffa502',
        bgColor: '#ffa50220',
        label: 'Excellent (4 ⭐)'
      },
      {
        tier: 'B',
        games: tiers.B.sort((a, b) => (b.playtimeForever || 0) - (a.playtimeForever || 0)),
        color: '#f1c40f',
        bgColor: '#f1c40f20',
        label: 'Good (3 ⭐)'
      },
      {
        tier: 'C',
        games: tiers.C.sort((a, b) => (b.playtimeForever || 0) - (a.playtimeForever || 0)),
        color: '#2ecc71',
        bgColor: '#2ecc7120',
        label: 'Average (2 ⭐)'
      },
      {
        tier: 'D',
        games: tiers.D.sort((a, b) => (b.playtimeForever || 0) - (a.playtimeForever || 0)),
        color: '#3498db',
        bgColor: '#3498db20',
        label: 'Below Average (1 ⭐)'
      },
      {
        tier: 'F',
        games: tiers.F.sort((a, b) => (b.playtimeForever || 0) - (a.playtimeForever || 0)),
        color: '#95a5a6',
        bgColor: '#95a5a620',
        label: 'Unrated (0 ⭐)'
      }
    ];
  }, [games]);

  const totalRatedGames = tierData.reduce((sum, tier) => sum + tier.games.length, 0);

  if (totalRatedGames === 0) {
    return (
      <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-12 text-center">
        <div className="text-6xl mb-4">🎮</div>
        <h3 className="text-xl font-bold text-[#e5e5e5] mb-2">No Rated Games Yet</h3>
        <p className="text-[#a0a0a0]">
          Rate your games to generate your personal tier list!
        </p>
        <p className="text-sm text-[#696969] mt-4">
          Click on any game and add a star rating (1-5 stars)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#e5e5e5] mb-2">🏆 Your Gaming Tier List</h2>
            <p className="text-[#a0a0a0]">
              Automatically generated from your star ratings • {totalRatedGames} games rated
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-[#696969]">Legend</div>
            <div className="text-xs text-[#696969] mt-1">
              S = 5⭐ • A = 4⭐ • B = 3⭐ • C = 2⭐ • D = 1⭐ • F = Unrated
            </div>
          </div>
        </div>
      </div>

      {/* Tier Rows */}
      {tierData.map(({ tier, games, color, bgColor }) => (
        <div
          key={tier}
          className="bg-[#1a1a1a] border border-[#333333] rounded-lg overflow-hidden hover:border-[#5a7fa3] transition-all"
        >
          <div className="flex">
            {/* Tier Label */}
            <div
              className="flex items-center justify-center px-8 py-6 font-bold text-4xl min-w-[120px]"
              style={{
                backgroundColor: bgColor,
                color: color,
                borderRight: `3px solid ${color}`
              }}
            >
              {tier}
            </div>

            {/* Games in this tier */}
            <div className="flex-1 p-4">
              {games.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[#696969] italic">
                  No games in this tier
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-3">
                    {games.map(game => (
                      <div
                        key={game.id}
                        className="group relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-105 hover:z-10 shadow-lg"
                        style={{ 
                          borderColor: color, 
                          borderWidth: '3px',
                          borderStyle: 'solid'
                        }}
                        title={`${game.name} - ${game.platform} - ${Math.round((game.playtimeForever || 0) / 60)}h`}
                      >
                        {game.imageUrl ? (
                          <img
                            src={game.imageUrl}
                            alt={game.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div 
                            className="w-full h-full flex items-center justify-center text-xs text-[#a0a0a0] p-2 text-center"
                            style={{ backgroundColor: `${color}10` }}
                          >
                            {game.name}
                          </div>
                        )}
                        
                        {/* Hover overlay with game name */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                          <div className="text-[#e5e5e5] text-xs font-semibold leading-tight">
                            {game.name}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Stats Summary */}
      <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
        <h3 className="text-lg font-bold text-[#e5e5e5] mb-4">Tier Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {tierData.map(({ tier, games, color }) => {
            const percentage = totalRatedGames > 0 
              ? Math.round((games.length / totalRatedGames) * 100) 
              : 0;
            
            return (
              <div key={tier} className="text-center">
                <div className="text-3xl font-bold mb-1" style={{ color }}>
                  {tier}
                </div>
                <div className="text-2xl font-bold text-[#e5e5e5] mb-1">
                  {games.length}
                </div>
                <div className="text-sm text-[#a0a0a0]">
                  {percentage}%
                </div>
                <div className="mt-2 h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
import type { LibraryGame } from '../types/games.types';
import { PlatformBadge } from './PlatformBadge';

interface GameCardProps {
  game: LibraryGame;
  onClick: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  const getGameImage = (game: LibraryGame) => {
    if (game.imageUrl) return game.imageUrl;
    
    // For Steam games, extract appId from platformGameId
    if (game.platform === 'steam') {
      return `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.platformGameId}/library_600x900.jpg`;
    }
    
    return 'https://via.placeholder.com/300x400/2a2a2a/5a5a5a?text=No+Image';
  };

  const is100Percent = () => {
    return game.achievementsTotal && game.achievementsTotal > 0 && 
           game.achievementsEarned === game.achievementsTotal;
  };

  const getAchievementPercentage = () => {
    if (!game.achievementsTotal || game.achievementsTotal === 0) return 0;
    return Math.round(((game.achievementsEarned || 0) / game.achievementsTotal) * 100);
  };

  const getConsoleDisplay = () => {
    if (game.platform !== 'retroachievements') return null;
    return (game as any).platformData?.consoleDisplayName || (game as any).platformData?.consoleName || null;
  };

  const consoleDisplay = getConsoleDisplay();

  return (
    <div onClick={onClick} className="group relative cursor-pointer">
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#1a1a1a] border border-[#333333] transition-all duration-300 hover:border-[#5a7fa3]">
        <img
          src={getGameImage(game)}
          alt={game.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = 'https://via.placeholder.com/300x400/2a2a2a/5a5a5a?text=No+Image';
          }}
        />
        
        <div className="absolute inset-0 bg-black/50 opacity-60 group-hover:opacity-40 transition-opacity duration-300" />

        {/* Platform Badge */}
        <div className="absolute top-4 left-4">
          <PlatformBadge platform={game.platform} />
        </div>

        {/* 100% Achievement Badge */}
        {is100Percent() && (
          <div className="absolute top-4 right-4 bg-[#5a7fa3] rounded px-2 py-1 flex items-center gap-1">
            <span className="text-[#e5e5e5] text-sm">🏆</span>
            <span className="text-[#e5e5e5] text-xs font-semibold">100%</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <h3 className="text-sm font-semibold text-[#e5e5e5] line-clamp-2 mb-3">
            {game.name}
          </h3>
          
          {/* Console badge for RA games */}
          {consoleDisplay && (
            <div className="mb-2">
              <span className="text-xs px-2 py-1 bg-[#2a2a2a] border border-[#5a7fa3] rounded text-[#7a9fc3] font-medium">
                {consoleDisplay}
              </span>
            </div>
          )}
          
          {/* Achievement Progress Bar */}
          {game.achievementsTotal && game.achievementsTotal > 0 && (
            <div className="relative h-1.5 bg-[#333333] rounded-full overflow-hidden">
              <div
                className="absolute inset-0 bg-[#5a7fa3] rounded-full transition-all duration-300"
                style={{ width: `${getAchievementPercentage()}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
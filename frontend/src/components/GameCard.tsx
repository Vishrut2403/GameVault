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
			return `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.platformGameId}/header.jpg`;
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

	return (
		<div onClick={onClick} className="group relative cursor-pointer" title={game.name}>
			<div className="relative aspect-[460/215] rounded-lg overflow-hidden bg-surface border border-line transition-all duration-300 hover:border-accent-line">
				<img
					src={getGameImage(game)}
					alt={game.name}
					className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
					onError={(e) => {
						e.currentTarget.src = 'https://via.placeholder.com/300x400/2a2a2a/5a5a5a?text=No+Image';
					}}
				/>
				
				{/* Platform Badge */}
				<div className="absolute top-2 left-2">
					<PlatformBadge platform={game.platform} />
				</div>

				{/* 100% Achievement Badge */}
				{is100Percent() && (
					<div className="absolute top-2 right-2 bg-accent rounded px-2 py-1 flex items-center gap-1">
						<span className="text-ink text-sm">🏆</span>
						<span className="text-ink text-xs font-semibold">100%</span>
					</div>
				)}

				{/* Achievement Progress Bar */}
				{(game.achievementsTotal ?? 0) > 0 && (
					<div className="absolute bottom-2 left-2 right-2 h-1.5 bg-subtle rounded-full overflow-hidden">
						<div
							className="absolute inset-0 bg-accent rounded-full transition-all duration-300"
							style={{ width: `${getAchievementPercentage()}%` }}
						/>
					</div>
				)}
			</div>
		</div>
	);
};
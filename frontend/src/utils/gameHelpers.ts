import type { LibraryGame } from '../types/games.types';

export const GAME_PLACEHOLDER = '/game-placeholder.svg';

export const getGameImage = (game: LibraryGame): string => {
	if (game.imageUrl) return game.imageUrl;
	
	// For Steam games, platformGameId IS the appId
	if (game.platform === 'steam') {
		return `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.platformGameId}/header.jpg`;
	}
	
	return GAME_PLACEHOLDER;
};

export const is100Percent = (game: LibraryGame): boolean => {
	return !!(game.achievementsTotal && game.achievementsTotal > 0 && 
					 game.achievementsEarned === game.achievementsTotal);
};

export const getAchievementPercentage = (game: LibraryGame): number => {
	if (!game.achievementsTotal || game.achievementsTotal === 0) return 0;
	return Math.round(((game.achievementsEarned || 0) / game.achievementsTotal) * 100);
};

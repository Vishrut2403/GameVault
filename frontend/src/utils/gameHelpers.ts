import type { LibraryGame } from '../types/games.types';

export const getGameImage = (game: LibraryGame): string => {
	if (game.imageUrl) return game.imageUrl;
	
	// For Steam games, platformGameId IS the appId
	if (game.platform === 'steam') {
		return `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.platformGameId}/library_600x900.jpg`;
	}
	
	return 'https://via.placeholder.com/300x400/1a1a1a/666?text=No+Image';
};

export const is100Percent = (game: LibraryGame): boolean => {
	return !!(game.achievementsTotal && game.achievementsTotal > 0 && 
					 game.achievementsEarned === game.achievementsTotal);
};

export const getAchievementPercentage = (game: LibraryGame): number => {
	if (!game.achievementsTotal || game.achievementsTotal === 0) return 0;
	return Math.round(((game.achievementsEarned || 0) / game.achievementsTotal) * 100);
};

export const getRatingColor = (rating: number | null): string => {
	if (!rating) return 'text-gray-500';
	if (rating >= 90) return 'text-blue-400';
	if (rating >= 80) return 'text-green-400';
	if (rating >= 70) return 'text-yellow-400';
	return 'text-orange-400';
};

export const formatRating = (game: LibraryGame): string => {
	if (!game.rating) return '-';
	const percentage = (game.rating / 5) * 100;
	return `${percentage.toFixed(2)}%`;
};

import api from './api';

class SteamService {

	async getLibrary(steamId: string) {
		const response = await api.get(`/steam/library/${steamId}`);
		return response.data;
	}

	async getEnrichedLibrary(steamId: string) {
		const timestamp = Date.now();
		const response = await api.get(`/steam/library/${steamId}/enriched?_t=${timestamp}`);
		return response.data;
	}

	async getFilteredLibrary(
		steamId: string,
		filters: {
			statuses?: string[];
			minRating?: number | null;
			maxRating?: number | null;
			maxPrice?: number | null;
			tags?: string[];
			searchQuery?: string;
		}
	) {
		const params = new URLSearchParams();
		
		if (filters.statuses && filters.statuses.length > 0) {
			params.append('statuses', filters.statuses.join(','));
		}
		if (filters.minRating !== null && filters.minRating !== undefined) {
			params.append('minRating', String(filters.minRating));
		}
		if (filters.maxRating !== null && filters.maxRating !== undefined) {
			params.append('maxRating', String(filters.maxRating));
		}
		if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
			params.append('maxPrice', String(filters.maxPrice));
		}
		if (filters.tags && filters.tags.length > 0) {
			params.append('tags', filters.tags.join(','));
		}
		if (filters.searchQuery && filters.searchQuery.trim()) {
			params.append('search', filters.searchQuery.trim());
		}
		
		const queryString = params.toString();
		const url = queryString 
			? `/steam/library/${steamId}/filter?${queryString}`
			: `/steam/library/${steamId}/filter`;
		
		const response = await api.get(url);
		return response.data;
	}

	async updateGamePrice(steamId: string, appId: string, pricePaid: number) {
		const response = await api.patch(`/steam/library/${steamId}/game/${appId}/price`, {
			pricePaid,
		});
		return response.data;
	}

	async updateGameStatus(steamId: string, appId: string, status: string) {
		const response = await api.patch(`/steam/library/${steamId}/game/${appId}/status`, {
			status,
		});
		return response.data;
	}

	async updateGameRating(steamId: string, appId: string, rating: number) {
		const response = await api.patch(`/steam/library/${steamId}/game/${appId}/rating`, {
			rating,
		});
		return response.data;
	}

	async updateGameTags(steamId: string, appId: string, tags: string[]) {
		const response = await api.patch(`/steam/library/${steamId}/game/${appId}/tags`, {
			tags,
		});
		return response.data;
	}

	async updateGameReview(steamId: string, appId: string, review: string) {
		const response = await api.patch(`/steam/library/${steamId}/game/${appId}/review`, {
			review,
		});
		return response.data;
	}

	async updateGameImage(steamId: string, appId: string, imageUrl: string) {
		const response = await api.patch(`/steam/library/${steamId}/game/${appId}/image`, {
			imageUrl,
		});
		return response.data;
	}

	async getRecommendations(steamId: string) {
		const response = await api.get(`/recommendations/${steamId}`);
		return response.data;
	}

	async optimizeBudget(steamId: string, budget: number) {
		const response = await api.post(`/recommendations/${steamId}/optimize`, {
			budget,
		});
		return response.data;
	}

	async getWishlist(steamId: string) {
		const response = await api.get(`/steam/wishlist/${steamId}`);
		return response.data;
	}

	async getPlayer(steamId: string) {
		const response = await api.get(`/steam/player/${steamId}`);
		return response.data;
	}

}

export default new SteamService();
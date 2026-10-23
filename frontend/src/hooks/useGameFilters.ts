import { useMemo } from 'react';
import type { LibraryGame, SortField, SortDirection } from '../types/games.types';

interface UseGameFiltersProps {
	games: LibraryGame[];
	filterStatus: string;
	filterPlatform: string;
	sortField: SortField;
	sortDirection: SortDirection;
}

export const useGameFilters = ({
	games,
	filterStatus,
	filterPlatform,
	sortField,
	sortDirection
}: UseGameFiltersProps) => {
	
	const filteredAndSortedGames = useMemo(() => {
		// Filter by status
		let filtered = games;
		
		if (filterStatus !== 'all') {
			filtered = filtered.filter(g => g.status === filterStatus);
		}

		// Filter by platform
		if (filterPlatform !== 'all') {
			filtered = filtered.filter(g => g.platform === filterPlatform);
		}

		// Sort
		const sorted = [...filtered];

		if (sortField === 'playtime') {
			const withPlaytime = sorted.filter(g => g.playtimeForever > 0);
			const withoutPlaytime = sorted.filter(g => g.playtimeForever === 0);

			withPlaytime.sort((a, b) => {
				const diff = a.playtimeForever - b.playtimeForever;
				return sortDirection === 'asc' ? diff : -diff;
			});

			return [...withPlaytime, ...withoutPlaytime];
		}

		if (sortField === 'pricePerHour') {
			const withPrice = sorted.filter(g => 
				g.pricePerHour !== null && 
				g.pricePerHour !== undefined && 
				g.playtimeForever > 0
			);
			const withoutPrice = sorted.filter(g => 
				g.pricePerHour === null || 
				g.pricePerHour === undefined || 
				g.playtimeForever === 0
			);

			withPrice.sort((a, b) => {
				const aPrice = a.pricePerHour || 0;
				const bPrice = b.pricePerHour || 0;
				return sortDirection === 'asc' ? aPrice - bPrice : bPrice - aPrice;
			});

			return [...withPrice, ...withoutPrice];
		}

		if (sortField === 'pricePaid') {
			const withPrice = sorted.filter(g => g.pricePaid !== null && g.pricePaid !== undefined);
			const withoutPrice = sorted.filter(g => g.pricePaid === null || g.pricePaid === undefined);

			withPrice.sort((a, b) => {
				const aPrice = a.pricePaid || 0;
				const bPrice = b.pricePaid || 0;
				return sortDirection === 'asc' ? aPrice - bPrice : bPrice - aPrice;
			});

			return [...withPrice, ...withoutPrice];
		}

		sorted.sort((a, b) => {
			let aVal: string | number;
			let bVal: string | number;

			switch (sortField) {
				case 'name':
					aVal = a.name.toLowerCase();
					bVal = b.name.toLowerCase();
					return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);

				case 'rating':
					aVal = a.rating ?? -1;
					bVal = b.rating ?? -1;
					break;

				case 'status': {
					const statusOrder = { completed: 0, playing: 1, backlog: 2, unplayed: 3 };
					aVal = statusOrder[a.status as keyof typeof statusOrder] ?? 4;
					bVal = statusOrder[b.status as keyof typeof statusOrder] ?? 4;
					break;
				}

				default:
					return 0;
			}

			const diff = aVal - bVal;
			return sortDirection === 'asc' ? diff : -diff;
		});

		return sorted;
	}, [games, filterStatus, filterPlatform, sortField, sortDirection]);

	return filteredAndSortedGames;
};
import { useState, useEffect, useMemo } from 'react';
import steamService from '../services/steam.service';
import { useAutoSync } from '../hooks/useAutoSync';
import SteamWishlist from '../components/SteamWishlist';
import RecommendationSystem from '../components/RecommendationSystem';
import SmartRecommendationsList from '../components/SmartRecommendationsList';
import { AddGameMenu } from '../components/AddGameMenu';
import SyncRALibraryModal from '../components/SyncRALibraryModal';
import AddRAGameModal from '../components/AddRAGameModal';
import AutoLinkISOsModal from '../components/AutoLinkISOsModal';
import { AddAppleGameModal } from '../components/AddAppleGameModal';
import { AddMinecraftWorldModal } from '../components/AddMinecraftWorldModal';
import { GameCard } from '../components/GameCard';
import { GameModal } from '../components/GameModal';
import { GameTable } from '../components/GameTable';
import { GameFilters, type GameFilterState } from '../components/GameFilters';
import type { LibraryGame, TabType, SortField, SortDirection } from '../types/games.types';
import { Analytics } from '../components/Analytics';
import { TierList } from '../components/TierList';
import ProfilePage from '../pages/ProfilePage';

interface HomeProps {
	user: any;
	onLogout: () => void;
}

function Home({ user, onLogout }: HomeProps) {
	const [loading, setLoading] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [library, setLibrary] = useState<any>(null);
	const [originalLibrary, setOriginalLibrary] = useState<any>(null);
	const [error, setError] = useState('');
	const [selectedGame, setSelectedGame] = useState<LibraryGame | null>(null);
	const [activeTab, setActiveTab] = useState<TabType>('journal');
	
	const { syncing: autoSyncing, triggerSync } = useAutoSync();
	
	const [showSyncRAModal, setShowSyncRAModal] = useState(false);
	const [showAddRAGameModal, setShowAddRAGameModal] = useState(false);
	const [showAutoLinkISOsModal, setShowAutoLinkISOsModal] = useState(false);
	const [showAddAppleGameModal, setShowAddAppleGameModal] = useState(false);
	const [showAddMinecraftWorldModal, setShowAddMinecraftWorldModal] = useState(false);
	
	const [sortField, setSortField] = useState<SortField>('playtime');
	const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
	const [showSortDropdown, setShowSortDropdown] = useState(false);

	// Multi-filter state
	const [filters, setFilters] = useState<GameFilterState>({
		platforms: [],
		statuses: [],
		minRating: null,
		maxRating: null,
		maxPrice: null,
		tags: [],
		searchQuery: '',
	});

	const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

	// Load library on mount
	useEffect(() => {
		if (user?.steamId) {
			loadFromDB(user.steamId);
		}
	}, [user]);

	useEffect(() => {
		if (!user?.steamId) return;
		
		if (filters.platforms.length > 0 || filters.statuses.length > 0 || filters.minRating !== null || filters.maxRating !== null || filters.maxPrice !== null || filters.tags.length > 0 || filters.searchQuery !== '') {
			applyFilters();
		} else {
			loadFromDB(user.steamId);
		}
	}, [filters, user?.steamId]);

	const loadFromDB = async (steamId: string) => {
		if (!steamId) return;

		setLoading(true);
		setError('');

		try {
			const data = await steamService.getEnrichedLibrary(steamId);
			setLibrary({ ...data, userId: user.id });
			setOriginalLibrary({ ...data, userId: user.id });
		} catch (err) {
			setError('Failed to load library');
		} finally {
			setLoading(false);
		}
	};

	const applyFilters = async () => {
		if (!user?.steamId || !library?.games) return;

		try {
			console.log('Applying filters:', filters);
			const data = await steamService.getFilteredLibrary(user.steamId, filters);
			console.log('Filtered results:', data.count, 'games');
			setLibrary({ ...data, userId: user.id });
		} catch (err) {
			console.error('Failed to apply filters:', err);
		}
	};

	const syncFromSteam = async () => {
		if (!user?.steamId) {
			alert('Please link your Steam account in Profile settings');
			return;
		}

		setSyncing(true);
		setError('');

		try {
			await steamService.getLibrary(user.steamId);
			const data = await steamService.getEnrichedLibrary(user.steamId);
			setLibrary({ ...data, userId: user.id });
			setFilters({
				platforms: [],
				statuses: [],
				minRating: null,
				maxRating: null,
				maxPrice: null,
				tags: [],
				searchQuery: '',
			});
		} catch (err) {
			setError('Failed to sync from Steam');
		} finally {
			setSyncing(false);
		}
	};

	const refreshFromDB = async () => {
		if (!user?.steamId) return;
		
		try {
			const data = await steamService.getEnrichedLibrary(user.steamId);
			setLibrary({ ...data, userId: user.id });
			setFilters({
				platforms: [],
				statuses: [],
				minRating: null,
				maxRating: null,
				maxPrice: null,
				tags: [],
				searchQuery: '',
			});
		} catch (err) {
			console.error('Failed to refresh');
		}
	};

	const handleAutoSync = async () => {
		try {
			await triggerSync();
			await new Promise(resolve => setTimeout(resolve, 1000));
			await refreshFromDB();
		} catch (err) {
			console.error('Auto-sync failed:', err);
		}
	};

	const reloadUser = async () => {
		try {
			const token = localStorage.getItem('token');
			const response = await fetch(`${API_URL}/api/auth/me`, {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			const data = await response.json();
			if (data.success) {
				localStorage.setItem('user', JSON.stringify(data.user));
				window.location.reload();
			}
		} catch (error) {
			console.error('Failed to reload user');
		}
	};

	const handleSyncAllEmulators = async () => {
		try {
			setLoading(true);

			const token = localStorage.getItem('token');
			const authHeaders = {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`,
			};

			const results = await Promise.allSettled([
				fetch(`${API_URL}/api/pcsx2/sync`, {
					method: 'POST',
					headers: authHeaders,
					body: JSON.stringify({ userId: user.id }),
				}).then(r => r.json()),

				fetch(`${API_URL}/api/ppsspp/sync`, {
					method: 'POST',
					headers: authHeaders,
					body: JSON.stringify({ userId: user.id }),
				}).then(r => r.json()),

				fetch(`${API_URL}/api/rpcs3/sync`, {
					method: 'POST',
					headers: authHeaders,
					body: JSON.stringify({ userId: user.id }),
				}).then(r => r.json()),

				user.enableRetroArch
					? fetch(`${API_URL}/api/retroarch/sync`, {
							method: 'POST',
							headers: authHeaders,
						}).then(r => r.json())
					: Promise.resolve({ success: true, message: 'RetroArch not enabled' }),
			]);

			results.forEach((result) => {
				if (result.status === 'fulfilled') {
				} else {
					console.warn('Sync failed:', result.reason?.message);
				}
			});

			await refreshFromDB();
		} catch (error) {
			console.error('Error syncing emulators:', error);
			alert('Failed to sync emulators');
		} finally {
			setLoading(false);
		}
	};

	// Get all unique tags from original (unfiltered) library, or library if original not set yet
	const availableTags: string[] = Array.from(
		new Set(
			(originalLibrary || library)?.games?.flatMap((g: LibraryGame) => g.userTags || []) || []
		)
	).sort() as string[];

	// Sort games (filtering is done on backend now)
	const filteredGames = useMemo(() => {
		let games = library?.games || [];
		
		// Apply sorting
		if (sortField === 'name') {
			games = [...games].sort((a, b) => a.name.localeCompare(b.name));
		} else if (sortField === 'playtime') {
			games = [...games].sort((a: LibraryGame, b: LibraryGame) => {
				const aVal = a.playtimeForever || 0;
				const bVal = b.playtimeForever || 0;
				return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
			});
		} else if (sortField === 'pricePaid') {
			games = [...games].sort((a: LibraryGame, b: LibraryGame) => {
				const aVal = a.pricePaid || 0;
				const bVal = b.pricePaid || 0;
				return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
			});
		} else if (sortField === 'pricePerHour') {
			// Separate games with cost data from those without
			const gamesWithData = games.filter((g: LibraryGame) => (g.pricePerHour ?? 0) > 0);
			const gamesWithoutData = games.filter((g: LibraryGame) => (g.pricePerHour ?? 0) === 0);
			
			// Sort games with data
			gamesWithData.sort((a: LibraryGame, b: LibraryGame) => {
				const aVal = a.pricePerHour || 0;
				const bVal = b.pricePerHour || 0;
				return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
			});
			
			// Combine: sorted data first, then games without data at the bottom
			games = [...gamesWithData, ...gamesWithoutData];
		} else if (sortField === 'rating') {
			games = [...games].sort((a: LibraryGame, b: LibraryGame) => {
				const aVal = a.rating || 0;
				const bVal = b.rating || 0;
				return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
			});
		}
		
		return games;
	}, [library?.games, sortField, sortDirection]);

	const getSortLabel = () => {
		const sortLabels: any = {
			name: 'Recent',
			playtime: 'Playtime',
			pricePaid: 'Price',
			pricePerHour: 'Price/Hour',
			rating: 'Rating'
		};
		return sortLabels[sortField] || 'Recent';
	};

	return (
		<div className="min-h-screen bg-[#000000] text-[#e5e5e5]">
			{/* Header */}
			<div className="sticky top-0 z-50 bg-[#1a1a1a] border-b border-[#333333]">
				<div className="max-w-[1800px] mx-auto px-8 py-5">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold tracking-tight text-[#e5e5e5]">Game Vault</h1>
							<p className="text-xs text-[#a0a0a0] font-medium">Pro Edition</p>
						</div>
						<div className="flex items-center gap-4">
							<div className="text-right">
								<p className="text-sm font-semibold text-[#e5e5e5]">{user.displayName || user.username}</p>
								<p className="text-xs text-[#a0a0a0]">Level {user.level} • {user.xp} XP</p>
							</div>
							<a
								href="/profile"
								className="px-4 py-2 bg-[#5a7fa3] border border-[#5a7fa3] rounded text-sm text-[#e5e5e5] hover:bg-[#7a9fc3] transition-all"
							>
								Settings
							</a>
							<button
								onClick={onLogout}
								className="px-4 py-2 bg-[#5a7fa3] border border-[#5a7fa3] rounded text-sm text-[#e5e5e5] hover:bg-[#7a9fc3] transition-all"
							>
								Logout
							</button>
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-[1800px] mx-auto px-8 py-16">
				{/* Tabs */}
				<div className="flex gap-3 mb-12 flex-wrap">
					{[
						{ key: 'profile', label: '👤 Profile' },
						{ key: 'journal', label: 'Journal' },
						{ key: 'dashboard', label: 'Dashboard' },
						{ key: 'wishlist', label: 'Wishlist' },
						{ key: 'recommendations', label: 'Recommendations' },
						{ key: 'smart-recommendations', label: 'Smart Pick' },
						{ key: 'analytics', label: 'Analytics' },
						{ key: 'tierlist', label: 'Tier List' },
					].map(({ key, label }) => (
						<button
							key={key}
							onClick={() => setActiveTab(key as TabType)}
							className={`px-6 py-3 rounded-lg font-semibold text-base transition-all duration-200 border ${
								activeTab === key
									? 'bg-[#5a7fa3] text-[#e5e5e5] border-[#7a9fc3]'
									: 'bg-[#1a1a1a] text-[#a0a0a0] border-[#333333] hover:text-[#e5e5e5] hover:bg-[#2a2a2a] hover:border-[#5a7fa3]'
							}`}
						>
							{label}
						</button>
					))}
				</div>

				{/* Filters & Toolbar */}
				{activeTab !== 'profile' && activeTab !== 'wishlist' && activeTab !== 'recommendations' && activeTab !== 'smart-recommendations' && activeTab !== 'analytics' && activeTab !== 'tierlist' && (
					<div className="mb-12 space-y-4">
						{/* Full-width Search Bar */}
						<input
							type="text"
							placeholder="Search games by name..."
							value={filters.searchQuery}
							onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
							className="w-full px-4 py-2 bg-[#2a2a2a] rounded border border-[#333333] text-[#e5e5e5] placeholder-[#696969] focus:border-[#5a7fa3] outline-none transition-all duration-200"
						/>

						{/* Game Filters, Sort & Action Buttons - Same Row */}
						<div className="flex items-end justify-between gap-4">
							<div className="flex items-end gap-3 flex-1">
								<GameFilters
									filters={filters}
									onFiltersChange={setFilters}
									availableTags={availableTags}
								/>
								
								{/* Sort Button - Next to filters */}
								<div className="relative">
									<button
										onClick={() => setShowSortDropdown(!showSortDropdown)}
										className={`flex items-center gap-2 px-4 py-2 rounded border transition-all duration-200 whitespace-nowrap ${
											sortField !== 'playtime'
												? 'bg-[#5a7fa3] border-[#7a9fc3] text-[#e5e5e5]'
												: 'bg-[#2a2a2a] border-[#333333] text-[#a0a0a0] hover:bg-[#333333]'
										}`}
									>
										Sort: {getSortLabel()} {sortDirection === 'asc' ? '↑' : '↓'}
										<svg className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
										</svg>
									</button>
									
									{showSortDropdown && (
										<div className="absolute top-full left-0 mt-2 w-48 bg-[#1a1a1a] border border-[#333333] rounded shadow-lg z-50 overflow-hidden">
											{[
												{ field: 'playtime' as SortField, label: 'Playtime' },
												{ field: 'pricePaid' as SortField, label: 'Price' },
												{ field: 'pricePerHour' as SortField, label: 'Cost/Hour' },
												{ field: 'rating' as SortField, label: 'Rating' },
											].map(({ field, label }) => (
												<button
													key={field}
													onClick={() => {
														if (sortField === field) {
															// Toggle direction if clicking the same sort option
															setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
														} else {
															// Set new sort field with descending direction
															setSortField(field);
															setSortDirection('desc');
														}
														setShowSortDropdown(false);
													}}
													className={`w-full px-4 py-2.5 text-left hover:bg-[#333333] transition-colors flex items-center justify-between ${
														sortField === field ? 'bg-[#5a7fa3] text-[#e5e5e5]' : 'text-[#a0a0a0]'
													}`}
												>
													<span>{label}</span>
													{sortField === field && (
														<span className="text-xs">
															{sortDirection === 'desc' ? '↓' : '↑'}
														</span>
													)}
												</button>
											))}
										</div>
									)}
								</div>
							</div>

							{/* Action Buttons - Right aligned, same row */}
							<div className="flex items-center gap-2 flex-shrink-0">
								<AddGameMenu 
									userId={user.id} 
									onGameAdded={refreshFromDB}
									onSyncRA={() => setShowSyncRAModal(true)}
									onAddRAGame={() => setShowAddRAGameModal(true)}
									onAutoLinkISOs={() => setShowAutoLinkISOsModal(true)}
									onAddAppleGame={() => setShowAddAppleGameModal(true)}
									onAddMinecraftWorld={() => setShowAddMinecraftWorldModal(true)}
								/>

								<button
									onClick={syncFromSteam}
									disabled={syncing || !user.steamId}
									className="px-6 py-2.5 bg-[#1a1a1a] rounded-xl border border-[#333333] font-semibold hover:bg-[#2a2a2a] transition-all duration-300 shadow-md disabled:opacity-50 text-[#e5e5e5] whitespace-nowrap"
								>
									{syncing ? '⟳ Syncing...' : '⟳ Sync Steam'}
								</button>

								<button
									onClick={handleSyncAllEmulators}
									disabled={loading}
									className="px-6 py-2.5 bg-[#1a1a1a] rounded-xl border border-[#333333] font-semibold hover:bg-[#2a2a2a] transition-all duration-300 shadow-md disabled:opacity-50 text-[#e5e5e5] whitespace-nowrap"
								>
									{loading ? '⟳ Syncing...' : '🕹️ Sync All Emulators'}
								</button>

								<button
									onClick={handleAutoSync}
									disabled={autoSyncing}
									className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-md disabled:opacity-50 whitespace-nowrap"
									title="Auto-sync Steam + all enabled emulators"
								>
									{autoSyncing ? (
										<>
											<span className="animate-spin inline-block mr-2">⏳</span>
											Auto-Syncing...
										</>
									) : (
										<>
											<span className="mr-1">✨</span>
											Sync All Platforms
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Error */}
				{error && (
					<div className="mb-6 p-4 bg-[#8b3a3a]/10 border border-[#a84a4a] rounded-lg text-[#ff9999] shadow-md">
						{error}
					</div>
				)}

				{/* Loading */}
				{loading && (
					<div className="flex items-center justify-center py-40">
						<div className="relative">
							<div className="w-20 h-20 border-4 border-slate-800/50 border-t-blue-500 rounded-full animate-spin" />
							<div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" style={{ animationDelay: '150ms' }} />
						</div>
					</div>
				)}

				{/* Content based on active tab */}
				{activeTab === 'profile' && (
					<ProfilePage user={user} onUpdate={reloadUser} />
				)}

				{activeTab === 'journal' && !loading && (
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-5">
						{filteredGames.map((game: LibraryGame) => (
							<GameCard
								key={game.id}
								game={game}
								onClick={() => setSelectedGame(game)}
							/>
						))}
					</div>
				)}

				{activeTab === 'dashboard' && !loading && (
					<GameTable
						games={filteredGames}
						onGameClick={setSelectedGame}
						onRefresh={refreshFromDB}
						steamId={user.steamId || ''}
					/>
				)}

				{activeTab === 'wishlist' && (
					<SteamWishlist userId={user.id} />
				)}

				{activeTab === 'recommendations' && (
					<RecommendationSystem userId={user.id} />
				)}

				{activeTab === 'smart-recommendations' && (
					<SmartRecommendationsList userId={user.id} limit={10} onSelectGame={(gameId) => {
						const game = library?.games?.find((g: LibraryGame) => g.id === gameId);
						setSelectedGame(game || null);
					}} />
				)}

				{activeTab === 'analytics' && !loading && (
					<Analytics games={library?.games || []} />
				)}

				{activeTab === 'tierlist' && !loading && (
					<TierList games={library?.games || []} />
				)}

				{/* Empty State */}
				{filteredGames.length === 0 && !loading && activeTab !== 'profile' && activeTab !== 'wishlist' && activeTab !== 'recommendations' && activeTab !== 'smart-recommendations' && activeTab !== 'analytics' && activeTab !== 'tierlist' && (
					<div className="flex items-center justify-center min-h-[400px]">
						<div className="text-center mx-auto px-6">
							<div className="w-20 h-20 mx-auto mb-4 rounded-lg bg-[#1a1a1a] border border-[#333333] flex items-center justify-center shadow-md">
								<span className="text-4xl">🎮</span>
							</div>
							<p className="text-gray-400 text-lg font-medium">No games found</p>
							{!user.steamId && (
								<p className="text-[#696969] text-sm mt-2">Link your Steam account in Profile to get started!</p>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Game Modal */}
			{selectedGame && (
				<GameModal
					game={selectedGame}
					onClose={() => setSelectedGame(null)}
					onUpdate={refreshFromDB}
					steamId={user.steamId || ''}
				/>
			)}

			{/* Modals */}
			<SyncRALibraryModal
				isOpen={showSyncRAModal}
				onClose={() => setShowSyncRAModal(false)}
				onSync={refreshFromDB}
				userId={user.id}
			/>

			<AddRAGameModal
				isOpen={showAddRAGameModal}
				onClose={() => setShowAddRAGameModal(false)}
				onAdd={refreshFromDB}
				userId={user.id}
			/>

			<AutoLinkISOsModal
				isOpen={showAutoLinkISOsModal}
				onClose={() => setShowAutoLinkISOsModal(false)}
				onLink={refreshFromDB}
				userId={user.id}
			/>

			<AddAppleGameModal
				isOpen={showAddAppleGameModal}
				onClose={() => setShowAddAppleGameModal(false)}
				onAdd={refreshFromDB}
				userId={user.id}
			/>

			<AddMinecraftWorldModal
				isOpen={showAddMinecraftWorldModal}
				onClose={() => setShowAddMinecraftWorldModal(false)}
				onAdd={refreshFromDB}
				userId={user.id}
			/>
		</div>
	);
}

export default Home;
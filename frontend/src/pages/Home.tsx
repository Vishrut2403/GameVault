import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import steamService from '../services/steam.service';
import { API_BASE_URL as API_URL } from '../services/api';
import { GameCard } from '../components/GameCard';
import { GameTable } from '../components/GameTable';
import { GameFilters, type GameFilterState } from '../components/GameFilters';
import type { LibraryGame, TabType, SortField, SortDirection } from '../types/games.types';
import type { User } from '../types/user.types';
import { ThemeToggle } from '../components/ThemeToggle';
import { prefetch, smartPicksUrl, sessionsUrl, WISHLIST_URL, BACKLOG_PLAN_URL } from '../services/cachedGet';

const loadProfile = () => import('../pages/ProfilePage');
const loadWishlist = () => import('../components/SteamWishlist');
const loadRecommendations = () => import('../components/RecommendationSystem');
const loadSmartPicks = () => import('../components/SmartRecommendationsList');
const loadPlanner = () => import('../components/BacklogPlanner');
const loadGameModal = () => import('../components/GameModal');
const loadAnalytics = () => import('../components/Analytics');
const loadTierList = () => import('../components/TierList');

const ProfilePage = lazy(loadProfile);
const SteamWishlist = lazy(loadWishlist);
const RecommendationSystem = lazy(loadRecommendations);
const SmartRecommendationsList = lazy(loadSmartPicks);
const BacklogPlanner = lazy(loadPlanner);
const GameModal = lazy(() => loadGameModal().then(m => ({ default: m.GameModal })));
const Analytics = lazy(() => loadAnalytics().then(m => ({ default: m.Analytics })));
const TierList = lazy(() => loadTierList().then(m => ({ default: m.TierList })));

// Every tab's code, plus the Analytics sub-pages, fetched once the page is idle.
const PRELOAD = [
	loadProfile, loadWishlist, loadRecommendations, loadSmartPicks, loadPlanner, loadGameModal, loadAnalytics, loadTierList,
	() => import('../components/analytics/AnalyticsDashboardPage'),
	() => import('../components/analytics/AnalyticsAchievementsPage'),
	() => import('../components/analytics/AnalyticsValuePage'),
];

const SMART_PICK_LIMIT = 10;

// The library as Home keeps it: the enriched Steam library plus its owner.
type Library = { games: LibraryGame[]; userId: string };

const TABS: { key: TabType; label: string }[] = [
	{ key: 'profile', label: 'Profile' },
	{ key: 'journal', label: 'Journal' },
	{ key: 'dashboard', label: 'Dashboard' },
	{ key: 'wishlist', label: 'Wishlist' },
	{ key: 'recommendations', label: 'Recommendations' },
	{ key: 'smart-recommendations', label: 'Smart Pick' },
	{ key: 'planner', label: 'Planner' },
	{ key: 'analytics', label: 'Analytics' },
	{ key: 'tierlist', label: 'Tier List' },
];

interface HomeProps {
	user: User;
	onLogout: () => void;
}

function Home({ user, onLogout }: HomeProps) {
	const [loading, setLoading] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [library, setLibrary] = useState<Library | null>(null);
	const [originalLibrary, setOriginalLibrary] = useState<Library | null>(null);
	const [error, setError] = useState('');
	const [selectedGame, setSelectedGame] = useState<LibraryGame | null>(null);
	const [activeTab, setActiveTab] = useState<TabType>('journal');
	// The tabs that show the library itself, with its filters and toolbar.
	const isLibraryTab = activeTab === 'journal' || activeTab === 'dashboard' || activeTab === 'library';

	// Preload every tab's code and data once the page is idle.
	useEffect(() => {
		const id = setTimeout(() => {
			PRELOAD.forEach((load) => load().catch(() => { /* the tab retries when opened */ }));
			prefetch(smartPicksUrl(user.id, SMART_PICK_LIMIT));
			prefetch(WISHLIST_URL);
			prefetch(sessionsUrl());
			prefetch(BACKLOG_PLAN_URL);
		}, 1000);
		return () => clearTimeout(id);
	}, [user.id]);

	const [sortField, setSortField] = useState<SortField>('playtime');
	const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
	const [showSortDropdown, setShowSortDropdown] = useState(false);

	// Multi-filter state
	const [filters, setFilters] = useState<GameFilterState>({
		statuses: [],
		minRating: null,
		maxRating: null,
		maxPrice: null,
		tags: [],
		searchQuery: '',
	});


	const loadFromDB = useCallback(async (steamId: string) => {
		if (!steamId) return;

		setLoading(true);
		setError('');

		try {
			const data = await steamService.getEnrichedLibrary(steamId);
			setLibrary({ ...data, userId: user.id });
			setOriginalLibrary({ ...data, userId: user.id });
		} catch {
			setError('Failed to load library');
		} finally {
			setLoading(false);
		}
	}, [user.id]);

	const applyFilters = useCallback(async () => {
		if (!user?.steamId) return;

		try {
			console.log('Applying filters:', filters);
			const data = await steamService.getFilteredLibrary(user.steamId, filters);
			console.log('Filtered results:', data.count, 'games');
			setLibrary({ ...data, userId: user.id });
		} catch (err) {
			console.error('Failed to apply filters:', err);
		}
	}, [filters, user.steamId, user.id]);

	// Also the initial load: no filters means the full library.
	useEffect(() => {
		if (!user?.steamId) return;
		
		if (filters.statuses.length > 0 || filters.minRating !== null || filters.maxRating !== null || filters.maxPrice !== null || filters.tags.length > 0 || filters.searchQuery !== '') {
			applyFilters();
		} else {
			loadFromDB(user.steamId);
		}
	}, [filters, user?.steamId, loadFromDB, applyFilters]);


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
				statuses: [],
				minRating: null,
				maxRating: null,
				maxPrice: null,
				tags: [],
				searchQuery: '',
			});
		} catch {
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
			
			// Update selectedGame if modal is open
			if (selectedGame) {
				const updatedGame = data.games.find((g: LibraryGame) => g.id === selectedGame.id);
				if (updatedGame) {
					setSelectedGame(updatedGame);
				}
			}
			
			setFilters({
				statuses: [],
				minRating: null,
				maxRating: null,
				maxPrice: null,
				tags: [],
				searchQuery: '',
			});
		} catch {
			console.error('Failed to refresh');
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
		} catch {
			console.error('Failed to reload user');
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
		const sortLabels: Record<SortField, string> = {
			name: 'Recent',
			playtime: 'Playtime',
			pricePaid: 'Price',
			pricePerHour: 'Price/Hour',
			rating: 'Rating',
			status: 'Status'
		};
		return sortLabels[sortField] || 'Recent';
	};

	return (
		<Suspense fallback={
			<div className="flex items-center justify-center py-40">
				<div className="relative">
					<div className="w-20 h-20 border-4 border-slate-800/50 border-t-blue-500 rounded-full animate-spin" />
					<div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" style={{ animationDelay: '150ms' }} />
				</div>
			</div>
		}>
		<div className="min-h-screen bg-page text-ink">
			{/* Header */}
			<div className="nb-header sticky top-0 z-50 bg-surface border-b border-line">
				<div className="max-w-[1800px] mx-auto px-8 py-5">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<span className="brutal-only nb-raise nb-fill-yellow w-11 h-11 flex items-center justify-center rounded-lg border border-line" aria-hidden="true">
								<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2C13 9 15 11 22 12C15 13 13 15 12 22C11 15 9 13 2 12C9 11 11 9 12 2Z" fill="currentColor" /></svg>
							</span>
							<div>
								<h1 className="text-2xl font-bold tracking-tight text-ink">Game Vault</h1>
								<p className="dark-only text-xs text-muted font-medium">Pro Edition</p>
							</div>
						</div>
						<nav aria-label="Main" className="brutal-only flex flex-wrap gap-1.5">
							{TABS.map(({ key, label }) => (
								<button
									key={key}
									onClick={() => setActiveTab(key)}
									aria-current={activeTab === key ? 'page' : undefined}
									className="nb-tab nb-raise min-h-11 px-3.5 py-2 rounded-lg text-[15px]"
								>
									{label}
								</button>
							))}
						</nav>
						<div className="flex items-center gap-4">
							<span
								className="brutal-only nb-fill-pink w-11 h-11 flex items-center justify-center rounded-full border border-line font-bold"
								role="img"
								aria-label={`${user.displayName || user.username}, level ${user.level}`}
								title={`${user.displayName || user.username} · Level ${user.level} · ${user.xp} XP`}
							>
								{(user.displayName || user.username).slice(0, 2).toUpperCase()}
							</span>
							<div className="dark-only text-right">
								<p className="text-sm font-semibold text-ink">{user.displayName || user.username}</p>
								<p className="text-xs text-muted">Level {user.level} • {user.xp} XP</p>
							</div>
							<ThemeToggle className="nb-raise px-4 py-2 bg-accent border border-accent-line rounded text-sm text-ink hover:bg-accent-hi transition-all" />
							<a
								href="/profile"
								className="nb-raise px-4 py-2 bg-accent border border-accent-line rounded text-sm text-ink hover:bg-accent-hi transition-all"
							>
								Settings
							</a>
							<button
								onClick={onLogout}
								className="nb-raise px-4 py-2 bg-accent border border-accent-line rounded text-sm text-ink hover:bg-accent-hi transition-all"
							>
								Logout
							</button>
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-[1800px] mx-auto px-8 py-16">
				{/* Tabs (the brutal theme shows them in the header instead) */}
				<div className="dark-only flex gap-3 mb-12 flex-wrap">
					{TABS.map(({ key, label }) => (
						<button
							key={key}
							onClick={() => setActiveTab(key)}
							className={`px-6 py-3 rounded-lg font-semibold text-base transition-all duration-200 border ${
								activeTab === key
									? 'bg-accent text-ink border-accent-hi-line'
									: 'bg-surface text-muted border-line hover:text-ink hover:bg-raised hover:border-accent-line'
							}`}
						>
							{label}
						</button>
					))}
				</div>

				{/* Filters & Toolbar */}
				{isLibraryTab && (
					<div className="mb-12 space-y-4">
						{/* Full-width Search Bar */}
						<input
							type="text"
							placeholder="Search games by name..."
							value={filters.searchQuery}
							onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
							className="w-full px-4 py-2 bg-raised rounded border border-line text-ink placeholder-faint focus:border-accent-line outline-none transition-all duration-200"
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
												? 'bg-accent border-accent-hi-line text-ink'
												: 'bg-raised border-line text-muted hover:bg-subtle'
										}`}
									>
										Sort: {getSortLabel()} {sortDirection === 'asc' ? '↑' : '↓'}
										<svg className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
										</svg>
									</button>
									
									{showSortDropdown && (
										<div className="absolute top-full left-0 mt-2 w-48 bg-surface border border-line rounded shadow-lg z-50 overflow-hidden">
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
													className={`w-full px-4 py-2.5 text-left hover:bg-subtle transition-colors flex items-center justify-between ${
														sortField === field ? 'bg-accent text-ink' : 'text-muted'
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
								<button
									onClick={syncFromSteam}
									disabled={syncing || !user.steamId}
									className="px-6 py-2.5 bg-surface rounded-xl border border-line font-semibold hover:bg-raised transition-all duration-300 shadow-md disabled:opacity-50 text-ink whitespace-nowrap"
								>
									{syncing ? '⟳ Syncing...' : '⟳ Sync Steam'}
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Error */}
				{error && (
					<div className="mb-6 p-4 bg-danger/10 border border-danger-line rounded-lg text-danger-fg shadow-md">
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

				{/* Content based on active tab. Its own Suspense keeps the header and tabs on screen while a tab's code loads. */}
				<Suspense fallback={
					<div className="flex justify-center py-16">
						<div className="w-10 h-10 border-4 border-line border-t-accent-line rounded-full animate-spin" />
					</div>
				}>
				{activeTab === 'profile' && (
					<ProfilePage user={user} onUpdate={reloadUser} />
				)}

				{activeTab === 'journal' && !loading && (
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-5">
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
					<SteamWishlist />
				)}

				{activeTab === 'recommendations' && (
					<RecommendationSystem userId={user.id} />
				)}

				{activeTab === 'smart-recommendations' && (
					<SmartRecommendationsList userId={user.id} limit={SMART_PICK_LIMIT} onSelectGame={(gameId) => {
						const game = library?.games?.find((g: LibraryGame) => g.id === gameId);
						setSelectedGame(game || null);
					}} />
				)}

				{activeTab === 'planner' && (
					<BacklogPlanner onSelectGame={(gameId) => {
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
				</Suspense>

				{/* Empty State */}
				{filteredGames.length === 0 && !loading && isLibraryTab && (
					<div className="flex items-center justify-center min-h-[400px]">
						<div className="text-center mx-auto px-6">
							<div className="w-20 h-20 mx-auto mb-4 rounded-lg bg-surface border border-line flex items-center justify-center shadow-md">
								<span className="text-4xl">🎮</span>
							</div>
							<p className="text-muted text-lg font-medium">No games found</p>
							{!user.steamId && (
								<p className="text-faint text-sm mt-2">Link your Steam account in Profile to get started!</p>
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

		</div>
		</Suspense>
	);
}

export default Home;
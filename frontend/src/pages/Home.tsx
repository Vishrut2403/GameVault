import { useState, useEffect, useRef } from 'react';
import steamService from '../services/steam.service';
import SteamWishlist from '../components/SteamWishlist';
import RecommendationSystem from '../components/RecommendationSystem';
import { AddGameMenu } from '../components/AddGameMenu';
import { PlatformBadge } from '../components/PlatformBadge';
import SyncRALibraryModal from '../components/SyncRALibraryModal';
import AddRAGameModal from '../components/AddRAGameModal';
import AutoLinkISOsModal from '../components/AutoLinkISOsModal';
import { AddAppleGameModal } from '../components/AddAppleGameModal';
import { AddMinecraftWorldModal } from '../components/AddMinecraftWorldModal';
import { GameCard } from '../components/GameCard';
import { GameModal } from '../components/GameModal';
import { GameTable } from '../components/GameTable';
import { useGameFilters } from '../hooks/useGameFilters';
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
  const [error, setError] = useState('');
  const [selectedGame, setSelectedGame] = useState<LibraryGame | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<TabType>('journal');
  
  const [showSyncRAModal, setShowSyncRAModal] = useState(false);
  const [showAddRAGameModal, setShowAddRAGameModal] = useState(false);
  const [showAutoLinkISOsModal, setShowAutoLinkISOsModal] = useState(false);
  const [showAddAppleGameModal, setShowAddAppleGameModal] = useState(false);
  const [showAddMinecraftWorldModal, setShowAddMinecraftWorldModal] = useState(false);
  
  const [sortField, setSortField] = useState<SortField>('playtime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Dropdown states
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  const platformDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(event.target as Node)) {
        setShowPlatformDropdown(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load library on mount
  useEffect(() => {
    if (user?.steamId) {
      loadFromDB(user.steamId);
    }
  }, [user]);

  const loadFromDB = async (steamId: string) => {
    if (!steamId) return;

    setLoading(true);
    setError('');

    try {
      const data = await steamService.getEnrichedLibrary(steamId);
      setLibrary({ ...data, userId: user.id });
    } catch (err) {
      setError('Failed to load library');
    } finally {
      setLoading(false);
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
    } catch (err) {
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
        window.location.reload(); // Reload to update user state in App.tsx
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

          // RetroArch — only syncs if enabled in profile
          user.enableRetroArch
            ? fetch(`${API_URL}/api/retroarch/sync`, {
                method: 'POST',
                headers: authHeaders,
              }).then(r => r.json())
            : Promise.resolve({ success: true, message: 'RetroArch not enabled' }),
        ]);

        results.forEach((result, index) => {
          const platform = ['pcsx2', 'ppsspp', 'rpcs3', 'retroarch'][index];
          if (result.status === 'fulfilled') {
          } else {
            console.warn(`[${platform}] Failed:`, result.reason?.message);
          }
        });

        await refreshFromDB();
      } catch (error) {
        console.error('❌ Error syncing emulators:', error);
        alert('❌ Failed to sync emulators');
      } finally {
        setLoading(false);
      }
    };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setShowSortDropdown(false);
  };

  const filteredGames = useGameFilters({
    games: library?.games || [],
    filterStatus,
    filterPlatform,
    sortField,
    sortDirection
  });

  const statusCounts = {
    all: library?.count || 0,
    playing: library?.games.filter((g: LibraryGame) => g.status === 'playing').length || 0,
    completed: library?.games.filter((g: LibraryGame) => g.status === 'completed').length || 0,
    backlog: library?.games.filter((g: LibraryGame) => g.status === 'backlog').length || 0,
  };

  const platformCounts = library?.games ? library.games.reduce((acc: any, game: LibraryGame) => {
    acc[game.platform] = (acc[game.platform] || 0) + 1;
    return acc;
  }, {}) : {};

  const getStatusLabel = () => {
    const statusMap: any = {
      all: 'All',
      playing: 'Playing',
      completed: 'Completed',
      backlog: 'Backlog'
    };
    return statusMap[filterStatus] || 'All';
  };

  const getPlatformLabel = () => {
    if (filterPlatform === 'all') return 'All';
    const count = platformCounts[filterPlatform] || 0;
    return `${count}`;
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-gray-950 text-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/80 border-b border-slate-800/50 shadow-lg backdrop-blur-xl">
        <div className="max-w-[1800px] mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Game Vault</h1>
              <p className="text-xs text-gray-400 font-medium">Pro Edition</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{user.displayName || user.username}</p>
                <p className="text-xs text-gray-400">Level {user.level} • {user.xp} XP</p>
              </div>
              <a
                href="/profile"
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-gray-300 hover:bg-slate-700/50 transition-all"
              >
                Settings
              </a>
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-gray-300 hover:bg-slate-700/50 transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-8 py-10">
        {/* Tabs */}
        <div className="flex gap-1 p-1.5 bg-slate-900/50 rounded-2xl border border-slate-800/50 mb-8 w-fit shadow-md">
          {[
            { key: 'profile', label: '👤 Profile' },
            { key: 'journal', label: 'Journal' },
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'wishlist', label: 'Wishlist' },
            { key: 'recommendations', label: 'Recommendations' },
            { key: 'analytics', label: 'Analytics' },
            { key: 'tierlist', label: 'Tier List' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as TabType)}
              className={`group relative px-7 py-3 rounded-xl font-semibold text-base transition-all duration-300 ${
                activeTab === key
                  ? 'bg-blue-600/20 text-white shadow-lg border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {label}
              {activeTab === key && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/20 to-transparent pointer-events-none" />
              )}
            </button>
          ))}
        </div>

        {/* Compressed Toolbar */}
        {activeTab !== 'profile' && activeTab !== 'wishlist' && activeTab !== 'recommendations' && activeTab !== 'analytics' && activeTab !== 'tierlist' && (
          <div className="mb-8">
            <div className="flex items-center justify-between gap-4">
              {/* Left Side - Filters */}
              <div className="flex items-center gap-3">
                {/* Sort Dropdown */}
                <div className="relative" ref={sortDropdownRef}>
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm font-medium text-gray-300 hover:bg-slate-700/50 transition-all flex items-center gap-2"
                  >
                    <span className="text-xs uppercase tracking-wider text-gray-500">SORT BY</span>
                    <span className="text-white">{getSortLabel()}</span>
                    <svg className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showSortDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
                      {[
                        { field: 'name' as SortField, label: 'Recent' },
                        { field: 'playtime' as SortField, label: 'Playtime ↓' },
                        { field: 'pricePaid' as SortField, label: 'Price' },
                        { field: 'pricePerHour' as SortField, label: 'Price/Hour' },
                        { field: 'rating' as SortField, label: 'Rating' },
                      ].map(({ field, label }) => (
                        <button
                          key={field}
                          onClick={() => handleSort(field)}
                          className={`w-full px-4 py-2.5 text-left hover:bg-slate-700/50 transition-colors ${
                            sortField === field ? 'bg-blue-600/20 text-blue-300' : 'text-gray-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Platform Dropdown */}
                <div className="relative" ref={platformDropdownRef}>
                  <button
                    onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
                    className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm font-medium text-gray-300 hover:bg-slate-700/50 transition-all flex items-center gap-2"
                  >
                    <span className="text-xs uppercase tracking-wider text-gray-500">PLATFORM</span>
                    {filterPlatform !== 'all' && (
                      <PlatformBadge platform={filterPlatform} showLabel={false} />
                    )}
                    <span className="text-white">{filterPlatform === 'all' ? 'All' : getPlatformLabel()}</span>
                    <svg className={`w-4 h-4 transition-transform ${showPlatformDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showPlatformDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden max-h-96 overflow-y-auto">
                      <button
                        onClick={() => {
                          setFilterPlatform('all');
                          setShowPlatformDropdown(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left hover:bg-slate-700/50 transition-colors flex items-center gap-2 ${
                          filterPlatform === 'all' ? 'bg-blue-600/20 text-blue-300' : 'text-gray-300'
                        }`}
                      >
                        <span>All</span>
                        <span className="ml-auto text-xs text-gray-500">({library?.count || 0})</span>
                      </button>
                      {Object.entries(platformCounts).map(([platform, count]) => (
                        <button
                          key={platform}
                          onClick={() => {
                            setFilterPlatform(platform);
                            setShowPlatformDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left hover:bg-slate-700/50 transition-colors flex items-center gap-2 ${
                            filterPlatform === platform ? 'bg-blue-600/20 text-blue-300' : 'text-gray-300'
                          }`}
                        >
                          <PlatformBadge platform={platform} showLabel={false} />
                          <span className="capitalize">{platform}</span>
                          <span className="ml-auto text-xs text-gray-500">({count as number})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Dropdown */}
                <div className="relative" ref={statusDropdownRef}>
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm font-medium text-gray-300 hover:bg-slate-700/50 transition-all flex items-center gap-2"
                  >
                    <span className="text-xs uppercase tracking-wider text-gray-500">LABEL</span>
                    <span className="text-white">{getStatusLabel()}</span>
                    <svg className={`w-4 h-4 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
                      {[
                        { key: 'all', label: 'All', count: statusCounts.all },
                        { key: 'playing', label: 'Playing', count: statusCounts.playing },
                        { key: 'completed', label: 'Completed', count: statusCounts.completed },
                        { key: 'backlog', label: 'Backlog', count: statusCounts.backlog },
                      ].map(({ key, label, count }) => (
                        <button
                          key={key}
                          onClick={() => {
                            setFilterStatus(key);
                            setShowStatusDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left hover:bg-slate-700/50 transition-colors flex items-center justify-between ${
                            filterStatus === key ? 'bg-blue-600/20 text-blue-300' : 'text-gray-300'
                          }`}
                        >
                          <span>{label}</span>
                          <span className="text-xs text-gray-500">{count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="px-4 py-2 pl-10 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 w-64"
                  />
                  <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Right Side - Actions */}
              <div className="flex items-center gap-2">
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
                  className="px-6 py-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50 font-semibold hover:bg-slate-700/50 transition-all duration-300 shadow-md disabled:opacity-50 text-white"
                >
                  {syncing ? '⟳ Syncing...' : '⟳ Sync Steam'}
                </button>

                <button
                  onClick={handleSyncAllEmulators}
                  disabled={loading}
                  className="px-6 py-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50 font-semibold hover:bg-slate-700/50 transition-all duration-300 shadow-md disabled:opacity-50 text-white"
                >
                  {loading ? '⟳ Syncing...' : '🕹️ Sync All Emulators'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-300 shadow-md">
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
            {filteredGames.map((game) => (
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

        {activeTab === 'analytics' && !loading && (
          <Analytics games={library?.games || []} />
        )}

        {activeTab === 'tierlist' && !loading && (
          <TierList games={library?.games || []} />
        )}

        {/* Empty State */}
        {filteredGames.length === 0 && !loading && activeTab !== 'profile' && activeTab !== 'wishlist' && activeTab !== 'recommendations' && activeTab !== 'analytics' && activeTab !== 'tierlist' && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center mx-auto px-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center shadow-md">
                <span className="text-4xl">🎮</span>
              </div>
              <p className="text-gray-400 text-lg font-medium">No games found</p>
              {!user.steamId && (
                <p className="text-gray-500 text-sm mt-2">Link your Steam account in Profile to get started!</p>
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
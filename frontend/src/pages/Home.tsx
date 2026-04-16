import { useState, useEffect, useRef } from 'react';
import steamService from '../services/steam.service';
import { useAutoSync } from '../hooks/useAutoSync';
import SteamWishlist from '../components/SteamWishlist';
import RecommendationSystem from '../components/RecommendationSystem';
import SmartRecommendationsList from '../components/SmartRecommendationsList';
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
  
  const { syncing: autoSyncing, triggerSync } = useAutoSync();
  
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

  const handleAutoSync = async () => {
    try {
      await triggerSync();
      // Wait for backend to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Refresh library view
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

        {/* Compressed Toolbar */}
        {activeTab !== 'profile' && activeTab !== 'wishlist' && activeTab !== 'recommendations' && activeTab !== 'analytics' && activeTab !== 'tierlist' && (
          <div className="mb-12">
            <div className="flex items-center justify-between gap-4">
              {/* Left Side - Filters */}
              <div className="flex items-center gap-3">
                {/* Sort Dropdown */}
                <div className="relative" ref={sortDropdownRef}>
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded text-sm font-medium text-[#a0a0a0] hover:bg-[#333333] transition-all flex items-center gap-2"
                  >
                    <span className="text-xs uppercase tracking-wider text-[#696969]">SORT BY</span>
                    <span className="text-[#e5e5e5]">{getSortLabel()}</span>
                    <svg className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showSortDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-[#1a1a1a] border border-[#333333] rounded shadow-lg z-50 overflow-hidden">
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
                          className={`w-full px-4 py-2.5 text-left hover:bg-[#333333] transition-colors ${
                            sortField === field ? 'bg-[#5a7fa3] text-[#e5e5e5]' : 'text-[#a0a0a0]'
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
                    className="px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded text-sm font-medium text-[#a0a0a0] hover:bg-[#333333] transition-all flex items-center gap-2"
                  >
                    <span className="text-xs uppercase tracking-wider text-[#696969]">PLATFORM</span>
                    {filterPlatform !== 'all' && (
                      <PlatformBadge platform={filterPlatform} showLabel={false} />
                    )}
                    <span className="text-[#e5e5e5]">{filterPlatform === 'all' ? 'All' : getPlatformLabel()}</span>
                    <svg className={`w-4 h-4 transition-transform ${showPlatformDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showPlatformDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-[#1a1a1a] border border-[#333333] rounded shadow-lg z-50 overflow-hidden max-h-96 overflow-y-auto">
                      <button
                        onClick={() => {
                          setFilterPlatform('all');
                          setShowPlatformDropdown(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left hover:bg-[#333333] transition-colors flex items-center gap-2 ${
                          filterPlatform === 'all' ? 'bg-[#5a7fa3] text-[#e5e5e5]' : 'text-[#a0a0a0]'
                        }`}
                      >
                        <span>All</span>
                        <span className="ml-auto text-xs text-[#696969]">({library?.count || 0})</span>
                      </button>
                      {Object.entries(platformCounts).map(([platform, count]) => (
                        <button
                          key={platform}
                          onClick={() => {
                            setFilterPlatform(platform);
                            setShowPlatformDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left hover:bg-[#333333] transition-colors flex items-center gap-2 ${
                            filterPlatform === platform ? 'bg-[#5a7fa3] text-[#e5e5e5]' : 'text-[#a0a0a0]'
                          }`}
                        >
                          <PlatformBadge platform={platform} showLabel={false} />
                          <span className="capitalize">{platform}</span>
                          <span className="ml-auto text-xs text-[#696969]">({count as number})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Dropdown */}
                <div className="relative" ref={statusDropdownRef}>
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded text-sm font-medium text-[#a0a0a0] hover:bg-[#333333] transition-all flex items-center gap-2"
                  >
                    <span className="text-xs uppercase tracking-wider text-[#696969]">LABEL</span>
                    <span className="text-[#e5e5e5]">{getStatusLabel()}</span>
                    <svg className={`w-4 h-4 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-[#1a1a1a] border border-[#333333] rounded shadow-lg z-50 overflow-hidden">
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
                          className={`w-full px-4 py-2.5 text-left hover:bg-[#333333] transition-colors flex items-center justify-between ${
                            filterStatus === key ? 'bg-[#5a7fa3] text-[#e5e5e5]' : 'text-[#a0a0a0]'
                          }`}
                        >
                          <span>{label}</span>
                          <span className="text-xs text-[#696969]">{count}</span>
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
                    className="px-4 py-2 pl-10 bg-[#1a1a1a] border border-[#333333] rounded-lg text-sm text-[#e5e5e5] placeholder-[#696969] focus:outline-none focus:border-[#5a7fa3] w-64"
                  />
                  <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#696969]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="px-6 py-2.5 bg-[#1a1a1a] rounded-xl border border-[#333333] font-semibold hover:bg-[#2a2a2a] transition-all duration-300 shadow-md disabled:opacity-50 text-[#e5e5e5]"
                >
                  {syncing ? '⟳ Syncing...' : '⟳ Sync Steam'}
                </button>

                <button
                  onClick={handleSyncAllEmulators}
                  disabled={loading}
                  className="px-6 py-2.5 bg-[#1a1a1a] rounded-xl border border-[#333333] font-semibold hover:bg-[#2a2a2a] transition-all duration-300 shadow-md disabled:opacity-50 text-[#e5e5e5]"
                >
                  {loading ? '⟳ Syncing...' : '🕹️ Sync All Emulators'}
                </button>

                <button
                  onClick={handleAutoSync}
                  disabled={autoSyncing}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-md disabled:opacity-50"
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
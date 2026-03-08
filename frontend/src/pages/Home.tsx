import { useState, useEffect } from 'react';
import steamService from '../services/steam.service';
import SteamWishlist from '../components/SteamWishlist';
import RecommendationSystem from '../components/RecommendationSystem';
import { AddGameMenu } from '../components/AddGameMenu';
import { PlatformBadge } from '../components/PlatformBadge';
import { SortButton } from '../components/SortButton';
import SyncRALibraryModal from '../components/SyncRALibraryModal';
import AddRAGameModal from '../components/AddRAGameModal';
import SyncPCSX2Modal from '../components/SyncPCSX2Modal';
import SyncRPCS3Modal from '../components/SyncRPCS3Modal';
import AutoLinkISOsModal from '../components/AutoLinkISOsModal';
import LinkPPSSPPModal from '../components/LinkPPSSPPModal';
import { GameCard } from '../components/GameCard';
import { GameModal } from '../components/GameModal';
import { GameTable } from '../components/GameTable';
import { useGameFilters } from '../hooks/useGameFilters';
import type { LibraryGame, TabType, SortField, SortDirection } from '../types/games.types';

function Home() {
  const [steamId, setSteamId] = useState('');
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
  const [showSyncPCSX2Modal, setShowSyncPCSX2Modal] = useState(false);
  const [showAutoLinkISOsModal, setShowAutoLinkISOsModal] = useState(false);
  const [showSyncRPCS3Modal, setShowSyncRPCS3Modal] = useState(false);
  const [showLinkPPSSPPModal, setShowLinkPPSSPPModal] = useState(false);
  
  const [sortField, setSortField] = useState<SortField>('playtime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const steamIdFromUrl = params.get('steamId');

    if (steamIdFromUrl) {
      setSteamId(steamIdFromUrl);
      window.history.replaceState({}, '', window.location.pathname);
      loadFromDB(steamIdFromUrl);
    }
  }, []);

  const handleSteamLogin = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    window.location.href = `${backendUrl}/api/auth/steam`;
  };

  const loadFromDB = async (idOverride?: string) => {
    const idToUse = idOverride || steamId;
    if (!idToUse.trim()) return;

    setLoading(true);
    setError('');

    try {
      const data = await steamService.getEnrichedLibrary(idToUse);
      setLibrary(data);
    } catch (err) {
      setError('Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  const syncFromSteam = async () => {
    if (!steamId.trim()) return;

    setSyncing(true);
    setError('');

    try {
      await steamService.getLibrary(steamId);
      const data = await steamService.getEnrichedLibrary(steamId);
      setLibrary(data);
    } catch (err) {
      setError('Failed to sync from Steam');
    } finally {
      setSyncing(false);
    }
  };

  const refreshFromDB = async () => {
    try {
      const data = await steamService.getEnrichedLibrary(steamId);
      setLibrary(data);
    } catch (err) {
      console.error('Failed to refresh');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-gray-950 text-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/80 border-b border-slate-800/50 shadow-lg backdrop-blur-xl">
        <div className="max-w-[1800px] mx-auto px-8 py-5">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Steam Tracker</h1>
              <p className="text-xs text-gray-400 font-medium">Pro Edition</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-8 py-10">
        {!steamId ? (
          // Welcome Screen
          <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 140px)' }}>
            <div className="text-center space-y-8 w-full max-w-md">
              <div className="space-y-3">
                <h2 className="text-4xl font-bold text-white">Welcome</h2>
                <p className="text-gray-400">Connect your Steam account to begin tracking your gaming journey</p>
              </div>
              <button
                onClick={handleSteamLogin}
                className="px-8 py-4 bg-slate-800/50 border border-slate-700/50 text-white font-semibold rounded-2xl shadow-md hover:bg-slate-700/50 transition-all duration-300"
              >
                Sign in with Steam
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 p-1.5 bg-slate-900/50 rounded-2xl border border-slate-800/50 mb-8 w-fit shadow-md">
              {[
                { key: 'journal', label: 'Journal' },
                { key: 'dashboard', label: 'Dashboard' },
                { key: 'wishlist', label: 'Wishlist' },
                { key: 'recommendations', label: 'Recommendations' },
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

            {/* Toolbar */}
            {activeTab !== 'wishlist' && activeTab !== 'recommendations' && (
              <div className="mb-8 space-y-4">
                {/* Status Filters */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {[
                      { key: 'all', label: 'All', count: statusCounts.all },
                      { key: 'playing', label: 'Playing', count: statusCounts.playing },
                      { key: 'completed', label: 'Completed', count: statusCounts.completed },
                      { key: 'backlog', label: 'Backlog', count: statusCounts.backlog },
                    ].map(({ key, label, count }) => (
                      <button
                        key={key}
                        onClick={() => setFilterStatus(key)}
                        className={`group px-5 py-2.5 rounded-xl transition-all duration-300 ${
                          filterStatus === key
                            ? 'bg-blue-600/20 border border-blue-500/30 text-white shadow-md'
                            : 'bg-slate-800/50 border border-slate-700/50 text-gray-400 hover:bg-slate-700/50 hover:text-white hover:border-slate-600/50'
                        }`}
                      >
                        <span className="font-semibold">{label}</span>
                        <span className={`ml-2 text-xs ${
                          filterStatus === key ? 'text-blue-300' : 'text-gray-500 group-hover:text-gray-400'
                        }`}>
                          {count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <AddGameMenu 
                      userId={library?.userId || ''} 
                      onGameAdded={refreshFromDB}
                      onSyncRA={() => setShowSyncRAModal(true)}
                      onAddRAGame={() => setShowAddRAGameModal(true)}
                      onSyncPCSX2={() => setShowSyncPCSX2Modal(true)}
                      onSyncRPCS3={() => setShowSyncRPCS3Modal(true)}
                      onAutoLinkISOs={() => setShowAutoLinkISOsModal(true)}
                      onLinkPPSSPP={() => setShowLinkPPSSPPModal(true)}
                    />

                    <button
                      onClick={syncFromSteam}
                      disabled={syncing}
                      className="px-6 py-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50 font-semibold hover:bg-slate-700/50 transition-all duration-300 shadow-md disabled:opacity-50 text-white"
                    >
                      {syncing ? '⟳ Syncing...' : '⟳ Sync Steam'}
                    </button>
                  </div>
                </div>

                {/* Platform Filters + Sort */}
                <div className="flex items-center justify-between gap-4">
                  {/* Platform filters */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold mr-2">Platform:</span>
                    <button
                      onClick={() => setFilterPlatform('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        filterPlatform === 'all'
                          ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
                          : 'bg-slate-800/50 border border-slate-700/50 text-gray-400 hover:bg-slate-700/50 hover:text-white'
                      }`}
                    >
                      All ({library?.count || 0})
                    </button>
                    {Object.entries(platformCounts).map(([platform, count]) => (
                      <button
                        key={platform}
                        onClick={() => setFilterPlatform(platform)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          filterPlatform === platform
                            ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
                            : 'bg-slate-800/50 border border-slate-700/50 text-gray-400 hover:bg-slate-700/50 hover:text-white'
                        }`}
                      >
                        <PlatformBadge platform={platform} showLabel={false} />
                        <span>{count as number}</span>
                      </button>
                    ))}
                  </div>

                  {/* Sort */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold mr-2">Sort:</span>
                    <SortButton field="name" label="Name" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} />
                    <SortButton field="playtime" label="Playtime" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} />
                    <SortButton field="pricePaid" label="Price" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} />
                    <SortButton field="pricePerHour" label="Price/Hour" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} />
                    <SortButton field="rating" label="Rating" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} />
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

            {/* Journal View */}
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

            {/* Dashboard */}
            {activeTab === 'dashboard' && !loading && (
              <GameTable
                games={filteredGames}
                onGameClick={setSelectedGame}
                onRefresh={refreshFromDB}
                steamId={steamId}
              />
            )}

            {/* Wishlist */}
            {activeTab === 'wishlist' && (
              <SteamWishlist userId={library?.userId || ''} />
            )}

            {/* Recommendations */}
            {activeTab === 'recommendations' && (
              <RecommendationSystem userId={library?.userId || ''} />
            )}

            {/* Empty State */}
            {filteredGames.length === 0 && !loading && activeTab !== 'wishlist' && activeTab !== 'recommendations' && (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center mx-auto px-6">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center shadow-md">
                    <span className="text-4xl">🎮</span>
                  </div>
                  <p className="text-gray-400 text-lg font-medium">No games found</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Game Modal */}
      {selectedGame && (
        <GameModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onUpdate={refreshFromDB}
          steamId={steamId}
        />
      )}

      {/* RetroAchievements Modals */}
      <SyncRALibraryModal
        isOpen={showSyncRAModal}
        onClose={() => setShowSyncRAModal(false)}
        onSync={refreshFromDB}
        userId={library?.userId || ''}
      />

      <AddRAGameModal
        isOpen={showAddRAGameModal}
        onClose={() => setShowAddRAGameModal(false)}
        onAdd={refreshFromDB}
        userId={library?.userId || ''}
      />

      {/* PCSX2 Modals */}
      <SyncPCSX2Modal
        isOpen={showSyncPCSX2Modal}
        onClose={() => setShowSyncPCSX2Modal(false)}
        onSync={refreshFromDB}
        userId={library?.userId || ''}
      />

      <AutoLinkISOsModal
        isOpen={showAutoLinkISOsModal}
        onClose={() => setShowAutoLinkISOsModal(false)}
        onLink={refreshFromDB}
        userId={library?.userId || ''}
      />

      {/* RPCS3 Modal */}
      <SyncRPCS3Modal
        isOpen={showSyncRPCS3Modal}
        onClose={() => setShowSyncRPCS3Modal(false)}
        onSync={refreshFromDB}
        userId={library?.userId || ''}
      />

      {/* PPSSPP Modal */}
      <LinkPPSSPPModal
        isOpen={showLinkPPSSPPModal}
        onClose={() => setShowLinkPPSSPPModal(false)}
        onLink={refreshFromDB}
        userId={library?.userId || ''}
      />
    </div>
  );
}

export default Home;
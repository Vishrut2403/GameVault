import { useState, useEffect } from 'react';
import axios from 'axios';
import steamService from '../services/steam.service';
import { PlatformBadge } from './PlatformBadge';
import { GameJournal } from './GameJournal';
import type { LibraryGame } from '../types/games.types';
import { getGameImage, getConsoleDisplay } from '../utils/gameHelpers';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface HltbData {
  gameplayMain:          number;
  gameplayMainExtra:     number;
  gameplayCompletionist: number;
  name:                  string;
}

interface GameModalProps {
  game:     LibraryGame;
  onClose:  () => void;
  onUpdate: () => Promise<void>;
  steamId:  string;
}

type TabType = 'overview' | 'journal';

export const GameModal: React.FC<GameModalProps> = ({ game, onClose, onUpdate, steamId }) => {
  const [activeTab,     setActiveTab]     = useState<TabType>('overview');
  const [editingReview, setEditingReview] = useState(game.review || '');
  const [savingReview,  setSavingReview]  = useState(false);
  const [editingImage,  setEditingImage]  = useState(game.imageUrl || '');
  const [savingImage,   setSavingImage]   = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [currentRating, setCurrentRating] = useState(game.rating || 0);

  const [hltbData,    setHltbData]    = useState<HltbData | null>(null);
  const [hltbLoading, setHltbLoading] = useState(false);

  useEffect(() => {
    setEditingReview(game.review || '');
    setEditingImage(game.imageUrl || '');
    setCurrentRating(game.rating || 0);
    setActiveTab('overview');
    setHltbData(null);
    fetchHltb();
  }, [game]);

  const fetchHltb = async () => {
    setHltbLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = game.platform === 'steam'
        ? `${API_URL}/api/hltb/steam/${game.platformGameId}`
        : `${API_URL}/api/hltb/name/${encodeURIComponent(game.name)}`;
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && res.data.data) {
        setHltbData(res.data.data);
      }
    } catch {
    } finally {
      setHltbLoading(false);
    }
  };

  const getAchievementPercentage = () => {
    if (!game.achievementsTotal || game.achievementsTotal === 0) return 0;
    return Math.round(((game.achievementsEarned || 0) / game.achievementsTotal) * 100);
  };

  const is100Percent = () => {
    return (
      game.achievementsTotal &&
      game.achievementsTotal > 0 &&
      game.achievementsEarned === game.achievementsTotal
    );
  };

  const updateStatus = async (status: string) => {
    try {
      if (game.platform === 'steam') {
        await steamService.updateGameStatus(steamId, game.platformGameId, status);
      } else {
        await steamService.updatePlatformGame(game.platform, game.platformGameId, game.userId, { status });
      }
      await onUpdate();
    } catch {
      console.error('Failed to update status');
    }
  };

  const updateRating = async (rating: number) => {
    setCurrentRating(rating);
    try {
      if (game.platform === 'steam') {
        await steamService.updateGameRating(steamId, game.platformGameId, rating);
      } else {
        await steamService.updatePlatformGame(game.platform, game.platformGameId, game.userId, { rating });
      }
      await onUpdate();
    } catch {
      console.error('Failed to update rating');
      setCurrentRating(game.rating || 0);
    }
  };

  const handleSaveReview = async () => {
    setSavingReview(true);
    try {
      if (game.platform === 'steam') {
        await steamService.updateGameReview(steamId, game.platformGameId, editingReview);
      } else {
        await steamService.updatePlatformGame(game.platform, game.platformGameId, game.userId, { review: editingReview });
      }
      await onUpdate();
    } catch {
      alert('Failed to save review');
    } finally {
      setSavingReview(false);
    }
  };

  const handleSaveImage = async () => {
    if (!editingImage.trim()) { alert('Please enter an image URL'); return; }
    if (!editingImage.startsWith('http://') && !editingImage.startsWith('https://')) {
      alert('Image URL must start with http:// or https://');
      return;
    }
    setSavingImage(true);
    try {
      if (game.platform === 'steam') {
        await steamService.updateGameImage(steamId, game.platformGameId, editingImage);
      } else {
        await steamService.updatePlatformGame(game.platform, game.platformGameId, game.userId, { imageUrl: editingImage });
      }
      await onUpdate();
    } catch {
      alert('Failed to save image');
    } finally {
      setSavingImage(false);
    }
  };

  const handleDeleteGame = async () => {
    if (!window.confirm(`Are you sure you want to delete "${game.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      if (game.platform === 'steam') { alert('Cannot delete Steam games. They will re-sync from Steam.'); return; }
      await steamService.deletePlatformGame(game.platform, game.platformGameId, game.userId);
      onClose();
      await onUpdate();
    } catch {
      alert('Failed to delete game');
    } finally {
      setDeleting(false);
    }
  };

  const consoleDisplay        = getConsoleDisplay(game);
  const achievementPercentage = getAchievementPercentage();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900/90 rounded-3xl shadow-md border border-slate-800/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero image */}
        <div className="relative h-80 overflow-hidden rounded-t-3xl">
          <img src={getGameImage(game)} alt={game.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-12 h-12 bg-slate-900/60 rounded-2xl border border-slate-700/50 flex items-center justify-center text-white text-2xl hover:bg-slate-800/60 hover:scale-110 transition-all duration-300"
          >
            ×
          </button>

          <div className="absolute top-6 left-6 flex items-center gap-3">
            <PlatformBadge platform={game.platform} />
            {is100Percent() && (
              <div
                className="px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-lg flex items-center gap-1.5 shadow-lg"
                title="All achievements completed!"
              >
                <span className="text-white text-lg">🏆</span>
                <span className="text-white text-xs font-bold">100%</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-800/50 px-8 pt-4">
          <div className="flex gap-6">
            {(['overview', 'journal'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 font-semibold transition-colors relative capitalize ${
                  activeTab === tab ? 'text-blue-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'journal' ? '📝 Journal' : 'Overview'}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* ── Overview Tab ── */}
          {activeTab === 'overview' && (
            <>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{game.name}</h2>
                {consoleDisplay && (
                  <span className="inline-block px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 text-sm font-medium">
                    {consoleDisplay}
                  </span>
                )}
              </div>

              {/* Playtime + Value */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-md">
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-2 font-semibold">Playtime</p>
                  <p className="text-3xl font-bold text-white">
                    {game.platform === 'apple_gc'
                      ? 'Not tracked'
                      : game.platform === 'retroachievements' && (game.playtimeForever || 0) === 0
                        ? 'Not synced yet'
                        : `${Math.round((game.playtimeForever || 0) / 60)}h`}
                  </p>
                </div>

                {game.pricePerHour && game.platform !== 'apple_gc' && game.platform !== 'retroachievements' && (
                  <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-md">
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-2 font-semibold">Value</p>
                    <p className="text-3xl font-bold text-emerald-400">₹{game.pricePerHour.toFixed(2)}/h</p>
                  </div>
                )}
              </div>

              {/* ── HLTB Section ── */}
              <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-300">How Long to Beat</p>
                  {hltbLoading && (
                    <span className="text-xs text-gray-500 animate-pulse">Fetching...</span>
                  )}
                  {!hltbLoading && hltbData && (
                    <span className="text-xs text-gray-600 italic">{hltbData.name}</span>
                  )}
                </div>

                {!hltbLoading && hltbData && (
                  <div className="grid grid-cols-3 gap-3">
                    {hltbData.gameplayMain > 0 && (
                      <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 text-center">
                        <p className="text-xs text-gray-500 mb-1">Main story</p>
                        <p className="text-xl font-bold text-white">{hltbData.gameplayMain}h</p>
                      </div>
                    )}
                    {hltbData.gameplayMainExtra > 0 && (
                      <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 text-center">
                        <p className="text-xs text-gray-500 mb-1">Main + extras</p>
                        <p className="text-xl font-bold text-violet-400">{hltbData.gameplayMainExtra}h</p>
                      </div>
                    )}
                    {hltbData.gameplayCompletionist > 0 && (
                      <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 text-center">
                        <p className="text-xs text-gray-500 mb-1">Completionist</p>
                        <p className="text-xl font-bold text-amber-400">{hltbData.gameplayCompletionist}h</p>
                      </div>
                    )}
                  </div>
                )}

                {!hltbLoading && !hltbData && (
                  <p className="text-xs text-gray-600">No HLTB data found for "{game.name}".</p>
                )}
              </div>

              {/* Achievements */}
              {game.achievementsTotal && game.achievementsTotal > 0 && (
                <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-300">Achievements</p>
                    <p className="text-sm font-semibold text-white">
                      {game.achievementsEarned || 0} / {game.achievementsTotal}
                      <span className="text-gray-400 ml-2">({achievementPercentage}%)</span>
                    </p>
                  </div>
                  <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${achievementPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Tags */}
              {game.userTags && game.userTags.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-300 mb-3">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {game.userTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50 text-sm font-medium text-gray-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cover image editor */}
              <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-md">
                <label className="block text-sm font-semibold text-gray-300 mb-3">Cover Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingImage}
                    onChange={(e) => setEditingImage(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-700/50 text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300"
                    placeholder="https://example.com/image.jpg"
                  />
                  <button
                    onClick={handleSaveImage}
                    disabled={savingImage}
                    className="px-6 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl font-semibold hover:bg-slate-600/50 transition-all duration-300 disabled:opacity-50 text-white whitespace-nowrap"
                  >
                    {savingImage ? 'Saving...' : 'Update Image'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enter a direct URL to an image (must start with http:// or https://)
                </p>
              </div>

              {/* Review */}
              <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-md">
                <label className="block text-sm font-semibold text-gray-300 mb-3">Personal Review</label>
                <textarea
                  value={editingReview}
                  onChange={(e) => setEditingReview(e.target.value)}
                  className="w-full h-32 px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-700/50 text-white placeholder-gray-500 resize-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300"
                  placeholder="Share your thoughts..."
                  maxLength={2000}
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">{editingReview.length}/2000</span>
                  <button
                    onClick={handleSaveReview}
                    disabled={savingReview}
                    className="px-6 py-2 bg-slate-700/50 border border-slate-600/50 rounded-xl font-semibold hover:bg-slate-600/50 transition-all duration-300 disabled:opacity-50 text-white"
                  >
                    {savingReview ? 'Saving...' : 'Save Review'}
                  </button>
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="text-sm font-semibold text-gray-300 mb-3">Status</p>
                <div className="grid grid-cols-4 gap-3">
                  {(['playing', 'completed', 'backlog', 'unplayed'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => updateStatus(status)}
                      className={`px-4 py-3 rounded-xl font-semibold capitalize transition-all duration-300 ${
                        game.status === status
                          ? 'bg-blue-600/20 border border-blue-500/30 text-white shadow-md'
                          : 'bg-slate-800/50 border border-slate-700/50 text-gray-400 hover:bg-slate-700/50 hover:text-white hover:border-slate-600/50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div>
                <p className="text-sm font-semibold text-gray-300 mb-3">Rating</p>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => updateRating(star)}
                      className={`flex-1 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all duration-300 ${
                        currentRating >= star
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-2xl'
                          : 'bg-slate-800/50 border border-slate-700/50 text-gray-700 hover:bg-slate-700/50 hover:scale-[1.05]'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Delete (non-Steam only) */}
              {game.platform !== 'steam' && (
                <div className="pt-4 border-t border-slate-800/50">
                  <button
                    onClick={handleDeleteGame}
                    disabled={deleting}
                    className="w-full px-6 py-3 bg-red-900/20 border border-red-500/30 text-red-300 rounded-xl font-semibold hover:bg-red-900/30 transition-all duration-300 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : '🗑️ Delete Game'}
                  </button>
                  <p className="text-xs text-gray-500 text-center mt-2">This action cannot be undone</p>
                </div>
              )}
            </>
          )}

          {/* ── Journal Tab ── */}
          {activeTab === 'journal' && (
            <GameJournal gameId={game.id} gameName={game.name} userId={game.userId} />
          )}
        </div>
      </div>
    </div>
  );
};
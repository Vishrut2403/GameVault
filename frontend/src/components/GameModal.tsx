import { useState, useEffect } from 'react';
import steamService from '../services/steam.service';
import { PlatformBadge } from './PlatformBadge';
import type { LibraryGame } from '../types/games.types';
import { getGameImage, getTierColor, getConsoleDisplay } from '../utils/gameHelpers';

interface GameModalProps {
  game: LibraryGame;
  onClose: () => void;
  onUpdate: () => Promise<void>;
  steamId: string;
}

export const GameModal: React.FC<GameModalProps> = ({ game, onClose, onUpdate, steamId }) => {
  const [editingReview, setEditingReview] = useState(game.review || '');
  const [savingReview, setSavingReview] = useState(false);
  const [editingImage, setEditingImage] = useState(game.headerImage || '');
  const [savingImage, setSavingImage] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentRating, setCurrentRating] = useState(game.rating || 0);

  useEffect(() => {
    setEditingReview(game.review || '');
    setEditingImage(game.headerImage || '');
    setCurrentRating(game.rating || 0);
  }, [game]);

  const updateStatus = async (status: string) => {
    try {
      if (game.platform === 'steam' && game.appId) {
        await steamService.updateGameStatus(steamId, game.appId, status);
      } else {
        await steamService.updatePlatformGame(
          game.platform,
          game.platformGameId,
          game.userId,
          { status }
        );
      }
      await onUpdate();
    } catch (err) {
      console.error('Failed to update status');
    }
  };

  const updateRating = async (rating: number) => {
    setCurrentRating(rating);
    
    try {
      if (game.platform === 'steam' && game.appId) {
        await steamService.updateGameRating(steamId, game.appId, rating);
      } else {
        await steamService.updatePlatformGame(
          game.platform,
          game.platformGameId,
          game.userId,
          { rating }
        );
      }
      await onUpdate();
    } catch (err) {
      console.error('Failed to update rating');
      setCurrentRating(game.rating || 0);
    }
  };

  const handleSaveReview = async () => {
    setSavingReview(true);
    try {
      if (game.platform === 'steam' && game.appId) {
        await steamService.updateGameReview(steamId, game.appId, editingReview);
      } else {
        await steamService.updatePlatformGame(
          game.platform,
          game.platformGameId,
          game.userId,
          { review: editingReview }
        );
      }
      await onUpdate();
    } catch (err) {
      alert('Failed to save review');
    } finally {
      setSavingReview(false);
    }
  };

  const handleSaveImage = async () => {
    if (!editingImage.trim()) {
      alert('Please enter an image URL');
      return;
    }

    if (!editingImage.startsWith('http://') && !editingImage.startsWith('https://')) {
      alert('Image URL must start with http:// or https://');
      return;
    }

    setSavingImage(true);
    try {
      if (game.platform === 'steam' && game.appId) {
        await steamService.updateGameImage(steamId, game.appId, editingImage);
      } else {
        await steamService.updatePlatformGame(
          game.platform,
          game.platformGameId,
          game.userId,
          { headerImage: editingImage }
        );
      }
      await onUpdate();
    } catch (err) {
      alert('Failed to save image');
    } finally {
      setSavingImage(false);
    }
  };

  const handleDeleteGame = async () => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${game.name}"? This cannot be undone.`
    );

    if (!confirmDelete) return;

    setDeleting(true);
    try {
      if (game.platform === 'steam') {
        alert('Cannot delete Steam games. They will re-sync from Steam.');
        return;
      }

      await steamService.deletePlatformGame(
        game.platform,
        game.platformGameId,
        game.userId
      );

      onClose();
      await onUpdate();
    } catch (err) {
      console.error('Failed to delete game:', err);
      alert('Failed to delete game');
    } finally {
      setDeleting(false);
    }
  };

  const consoleDisplay = getConsoleDisplay(game);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900/90 rounded-3xl shadow-md border border-slate-800/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-80 overflow-hidden rounded-t-3xl">
          <img
            src={getGameImage(game)}
            alt={game.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
          
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-12 h-12 bg-slate-900/60 rounded-2xl border border-slate-700/50 flex items-center justify-center text-white text-2xl hover:bg-slate-800/60 hover:scale-110 transition-all duration-300"
          >
            ×
          </button>

          <div className="absolute top-6 left-6 flex items-center gap-3">
            <PlatformBadge platform={game.platform} />
            
            {/* Achievement Completion Badge */}
            {game.totalAchievements && game.totalAchievements > 0 && game.achievementPercentage === 100 && (
              <div 
                className="px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-lg flex items-center gap-1.5 shadow-lg"
                title="All achievements completed!"
              >
                <span className="text-white text-lg">🏆</span>
                <span className="text-white text-xs font-bold">100%</span>
              </div>
            )}
          </div>

          {game.tier && (
            <div className={`absolute top-6 right-24 w-16 h-16 bg-gradient-to-br ${getTierColor(game.tier)} rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md`}>
              {game.tier}
            </div>
          )}
        </div>

        <div className="p-8 space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">{game.name}</h2>
            {consoleDisplay && (
              <span className="inline-block px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 text-sm font-medium">
                {consoleDisplay}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-md">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2 font-semibold">Playtime</p>
              <p className="text-3xl font-bold text-white">
                {game.platform === 'apple_gc'
                  ? 'Not tracked'
                  : game.platform === 'retroachievements' && game.playtimeForever > 0
                    ? `${Math.round(game.playtimeForever / 60)}h`
                    : game.platform === 'retroachievements'
                      ? 'Not synced yet'
                      : `${Math.round(game.playtimeForever / 60)}h`}
              </p>
            </div>

            {game.pricePerHour && game.platform !== 'apple_gc' && game.platform !== 'retroachievements' && (
              <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-md">
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-2 font-semibold">Value</p>
                <p className="text-3xl font-bold text-emerald-400">₹{game.pricePerHour.toFixed(2)}/h</p>
              </div>
            )}
          </div>

          {game.totalAchievements && game.totalAchievements > 0 && (
            <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-300">Achievements</p>
                <p className="text-sm font-semibold text-white">
                  {game.completedAchievements} / {game.totalAchievements}
                  <span className="text-gray-400 ml-2">({game.achievementPercentage}%)</span>
                </p>
              </div>
              <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                  style={{ width: `${game.achievementPercentage || 0}%` }}
                />
              </div>
            </div>
          )}

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

          {/* Cover Image Editor */}
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

          {/* Delete Button (only for non-Steam games) */}
          {game.platform !== 'steam' && (
            <div className="pt-4 border-t border-slate-800/50">
              <button
                onClick={handleDeleteGame}
                disabled={deleting}
                className="w-full px-6 py-3 bg-red-900/20 border border-red-500/30 text-red-300 rounded-xl font-semibold hover:bg-red-900/30 transition-all duration-300 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : '🗑️ Delete Game'}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                This action cannot be undone
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
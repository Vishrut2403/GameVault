import { useState } from 'react';
import steamService from '../services/steam.service';
import { PlatformBadge } from './PlatformBadge';
import type { LibraryGame } from '../types/games.types';
import { getGameImage, getConsoleDisplay } from '../utils/gameHelpers';

interface GameTableProps {
  games: LibraryGame[];
  onGameClick: (game: LibraryGame) => void;
  onRefresh: () => Promise<void>;
  steamId: string;
}

export const GameTable: React.FC<GameTableProps> = ({ games, onGameClick, onRefresh, steamId }) => {
  const [editingPrice, setEditingPrice] = useState<{ [key: string]: string }>({});
  const [savingPrice, setSavingPrice] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState<{ [key: string]: string }>({});
  const [savingTags, setSavingTags] = useState<string | null>(null);

  const getGameKey = (game: LibraryGame) => game.id;

  const handlePriceChange = (gameKey: string, value: string) => {
    setEditingPrice((prev) => ({ ...prev, [gameKey]: value }));
  };

  const handleSavePrice = async (game: LibraryGame) => {
    const gameKey = getGameKey(game);
    const priceStr = editingPrice[gameKey];
    const price = parseFloat(priceStr);

    if (isNaN(price) || price < 0) {
      alert('Please enter a valid price');
      return;
    }

    setSavingPrice(gameKey);

    try {
      if (game.platform === 'steam') {
        await steamService.updateGamePrice(steamId, game.platformGameId, price);
      } else {
        await steamService.updatePlatformGame(
          game.platform,
          game.platformGameId,
          game.userId,
          { pricePaid: price }
        );
      }
      
      await onRefresh();
      setEditingPrice((prev) => {
        const newState = { ...prev };
        delete newState[gameKey];
        return newState;
      });
    } catch (err) {
      alert('Failed to save price');
    } finally {
      setSavingPrice(null);
    }
  };

  const handleTagChange = (gameKey: string, value: string) => {
    setEditingTags((prev) => ({ ...prev, [gameKey]: value }));
  };

  const handleSaveTags = async (game: LibraryGame) => {
    const gameKey = getGameKey(game);
    const tagsStr = editingTags[gameKey] || '';
    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    setSavingTags(gameKey);

    try {
      if (game.platform === 'steam') {
        await steamService.updateGameTags(steamId, game.platformGameId, tags);
      } else {
        await steamService.updatePlatformGame(
          game.platform,
          game.platformGameId,
          game.userId,
          { userTags: tags }
        );
      }
      
      await onRefresh();
      setEditingTags((prev) => {
        const newState = { ...prev };
        delete newState[gameKey];
        return newState;
      });
    } catch (err) {
      alert('Failed to save tags');
    } finally {
      setSavingTags(null);
    }
  };

  const getRatingColor = (rating: number | null) => {
    if (!rating) return 'text-[#a0a0a0]';
    if (rating >= 90) return 'text-[#7a9fc3]';
    if (rating >= 80) return 'text-[#7a9fc3]';
    if (rating >= 70) return 'text-[#a0a0a0]';
    return 'text-[#a0a0a0]';
  };

  const formatRating = (game: LibraryGame) => {
    if (!game.rating) return '-';
    const percentage = (game.rating / 5) * 100;
    return `${percentage.toFixed(2)}%`;
  };

  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-[#333333] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#000000] border-b border-[#333333]">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#a0a0a0]">Name</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-[#a0a0a0]">Price/Hour</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-[#a0a0a0]">Price</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-[#a0a0a0]">Time</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-[#a0a0a0]">Rating</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#a0a0a0]">Tags</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game, index) => {
              const gameKey = getGameKey(game);
              const hours = ((game.playtimeForever || 0) / 60).toFixed(1);
              const isEditingTag = editingTags[gameKey] !== undefined;
              const isSavingTag = savingTags === gameKey;
              const isEditingPriceField = editingPrice[gameKey] !== undefined;
              const isSavingPriceField = savingPrice === gameKey;
              const consoleDisplay = getConsoleDisplay(game);
              
              return (
                <tr
                  key={game.id}
                  className={`border-b border-[#333333] transition-all duration-200 ${
                    index % 2 === 0 ? 'bg-[#1a1a1a] hover:bg-[#404040]' : 'bg-[#353535] hover:bg-[#404040]'
                  }`}
                >
                  {/* Name Column */}
                  <td className="px-6 py-4">
                    <div 
                      className="flex items-center gap-4 cursor-pointer"
                      onClick={() => onGameClick(game)}
                    >
                      <div className="relative w-24 h-14 rounded-md overflow-hidden flex-shrink-0 border border-[#333333]">
                        <img
                          src={getGameImage(game)}
                          alt={game.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/300x400/2a2a2a/5a5a5a?text=No+Image';
                          }}
                        />
                      </div>
                      <div>
                        <div className="text-[#e5e5e5] font-medium mb-1">{game.name}</div>
                        <div className="flex items-center gap-2">
                          <PlatformBadge platform={game.platform} />
                          {consoleDisplay && (
                            <span className="text-xs px-2 py-0.5 bg-[#2a2a2a] border border-[#5a7fa3] rounded text-[#7a9fc3]">
                              {consoleDisplay}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Price/Hour */}
                  <td className="px-6 py-4 text-right">
                    {game.pricePerHour && (game.playtimeForever || 0) > 0 ? (
                      <span className={`font-semibold ${
                        game.pricePerHour < 10 ? 'text-[#4ddc4d]' :
                        game.pricePerHour < 50 ? 'text-[#ffdd44]' : 
                        'text-[#ff6666]'
                      }`}>
                        ₹{game.pricePerHour.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[#696969]">-</span>
                    )}
                  </td>

                  {/* Price */}
                  <td
                    className="px-6 py-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isEditingPriceField ? (
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={editingPrice[gameKey]}
                          onChange={(e) => handlePriceChange(gameKey, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSavePrice(game);
                            if (e.key === 'Escape') {
                              setEditingPrice((prev) => {
                                const newState = { ...prev };
                                delete newState[gameKey];
                                return newState;
                              });
                            }
                          }}
                          className="w-24 px-3 py-1.5 bg-[#333333] border border-[#5a7fa3] rounded text-[#e5e5e5] text-sm text-right focus:outline-none focus:border-[#7a9fc3]"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSavePrice(game)}
                          disabled={isSavingPriceField}
                          className="px-3 py-1.5 bg-[#5a7fa3] text-[#e5e5e5] text-xs font-semibold rounded hover:bg-[#7a9fc3] transition-all duration-200 disabled:opacity-50"
                        >
                          {isSavingPriceField ? '...' : 'Save'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[#e5e5e5] font-medium">
                          {game.pricePaid !== null && game.pricePaid !== undefined
                            ? `₹ ${game.pricePaid.toFixed(0)}`
                            : (game.platform === 'apple_gc' || game.platform === 'retroachievements') ? '-' : 'Free'}
                        </span>
                        {game.platform !== 'apple_gc' && game.platform !== 'retroachievements' && (
                          <button
                            onClick={() =>
                              setEditingPrice((prev) => ({
                                ...prev,
                                [gameKey]: game.pricePaid?.toString() || '',
                              }))
                            }
                            className="text-[#696969] hover:text-[#5a7fa3] text-xs transition-colors"
                          >
                            ✎
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Time */}
                  <td className="px-6 py-4 text-right">
                    {game.platform === 'apple_gc' ? (
                      <span className="text-[#696969]">-</span>
                    ) : game.platform === 'retroachievements' && (game.playtimeForever || 0) > 0 ? (
                      <span className="text-[#e5e5e5] font-medium">{hours}h</span>
                    ) : game.platform === 'retroachievements' ? (
                      <span className="text-[#696969]">Not synced</span>
                    ) : (
                      <span className="text-[#e5e5e5] font-medium">{hours}h</span>
                    )}
                  </td>

                  {/* Rating */}
                  <td className="px-6 py-4 text-center">
                    <span className={`font-semibold ${getRatingColor(game.rating)}`}>
                      {formatRating(game)}
                    </span>
                  </td>

                  {/* Tags */}
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    {isEditingTag ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingTags[gameKey]}  
                          onChange={(e) => handleTagChange(gameKey, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTags(game);
                            if (e.key === 'Escape') setEditingTags((prev) => {
                              const newState = { ...prev };
                              delete newState[gameKey];
                              return newState;
                            });
                          }}
                          placeholder="tag1, tag2, tag3"
                          className="flex-1 px-3 py-1.5 bg-[#333333] border border-[#5a7fa3] rounded text-[#e5e5e5] text-sm focus:outline-none focus:border-[#7a9fc3]"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveTags(game)}
                          disabled={isSavingTag}
                          className="px-3 py-1.5 bg-[#5a7fa3] text-[#e5e5e5] text-xs font-semibold rounded hover:bg-[#7a9fc3] transition-all duration-200"
                        >
                          {isSavingTag ? '...' : 'Save'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap items-center">
                        {game.userTags?.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-[#333333] rounded-full border border-[#5a5a5a] text-xs font-medium text-[#a0a0a0]"
                          >
                            {tag}
                          </span>
                        ))}
                        <button
                          onClick={() => setEditingTags((prev) => ({
                            ...prev,
                            [gameKey]: game.userTags?.join(', ') || '',
                          }))}
                          className="px-3 py-1 text-[#696969] hover:text-[#5a7fa3] text-xs transition-colors"
                        >
                          {game.userTags?.length ? '✎' : '+ Tag'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
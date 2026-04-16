import { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface HltbInfo {
  main:          number | null;
  extra:         number | null;
  completionist: number | null;
  matchedName:   string | null;
}

interface RecommendedGame {
  id:              string;
  name:            string;
  tags:            string[];
  listPrice:       number;
  currentPrice:    number;
  discountPercent: number;
  finalScore:      number;
  breakdown: {
    discountScore: number;
    valueScore:    number;
    tagMatchScore: number;
    ratingScore:   number;
  };
  hltb:             HltbInfo;
  estimatedPlaytime: number;
  reasoning:        string[];
}

interface RecommendationSystemProps {
  userId: string;
}

function RecommendationSystem({ userId }: RecommendationSystemProps) {
  const [budget,        setBudget]        = useState<string>('1000');
  const [loading,       setLoading]       = useState(false);
  const [selectedGames, setSelectedGames] = useState<RecommendedGame[]>([]);
  const [totalCost,     setTotalCost]     = useState(0);
  const [totalScore,    setTotalScore]    = useState(0);
  const [remaining,     setRemaining]     = useState(0);
  const [error,         setError]         = useState('');

  const handleOptimize = async () => {
    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) { setError('Please enter a valid budget'); return; }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/recommendations/${userId}/optimize`,
        { budget: budgetNum },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        setSelectedGames(response.data.selectedGames || []);
        setTotalCost(response.data.totalCost     || 0);
        setTotalScore(response.data.totalScore   || 0);
        setRemaining(response.data.remaining     || 0);
        if (response.data.selectedGames?.length === 0) {
          setError('No games found within budget or wishlist is empty');
        }
      }
    } catch {
      setError('Failed to optimize. Check your wishlist and try again.');
    } finally {
      setLoading(false);
    }
  };

  const getValueLabel = (game: RecommendedGame) => {
    const hrs = game.hltb?.completionist;
    if (hrs && hrs > 0 && game.currentPrice > 0) {
      const hrsPerRupee = hrs / game.currentPrice;
      if (hrsPerRupee >= 0.1)  return { text: 'Excellent value', color: 'text-green-400' };
      if (hrsPerRupee >= 0.05) return { text: 'Good value',      color: 'text-blue-400' };
      return { text: 'Average value', color: 'text-gray-400' };
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-[#e5e5e5] mb-3">Recommendation System</h2>
        <p className="text-[#a0a0a0]">
          Optimal game picks within your budget — scored by discount, HLTB value, and your taste
        </p>
      </div>

      {/* Budget input */}
      <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-[#a0a0a0] mb-3">Budget (₹)</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="1000"
              className="w-full px-4 py-3 bg-[#1a1a1a] text-[#e5e5e5] text-lg rounded-lg border border-[#333333] focus:outline-none focus:ring-2 focus:ring-[#5a7fa3]/20 focus:border-[#5a7fa3] transition-all duration-300"
              min="0"
              step="100"
            />
          </div>
          <button
            onClick={handleOptimize}
            disabled={loading}
            className="px-8 py-3 bg-[#5a7fa3] border border-[#5a7fa3] text-[#e5e5e5] font-semibold rounded-lg hover:bg-[#7a9fc3] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Optimizing...' : 'Run Recommendation'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#8b3a3a] border border-[#a84a4a] rounded-lg p-4 text-[#ff9999]">
          {error}
        </div>
      )}

      {/* Summary cards */}
      {selectedGames.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
            <p className="text-[#a0a0a0] text-sm font-semibold mb-1 uppercase tracking-wider">Games Selected</p>
            <p className="text-[#e5e5e5] text-3xl font-bold">{selectedGames.length}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
            <p className="text-[#a0a0a0] text-sm font-semibold mb-1 uppercase tracking-wider">Total Cost</p>
            <p className="text-[#e5e5e5] text-3xl font-bold">₹{totalCost.toFixed(2)}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
            <p className="text-[#a0a0a0] text-sm font-semibold mb-1 uppercase tracking-wider">Total Score</p>
            <p className="text-[#e5e5e5] text-3xl font-bold">{totalScore}</p>
          </div>
        </div>
      )}

      {/* Remaining budget */}
      {selectedGames.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-[#a0a0a0] font-medium">Remaining Budget:</span>
            <span className="text-2xl font-bold text-[#7aaa8a]">₹{remaining.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Game cards */}
      {selectedGames.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Recommended Games</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedGames.map((game) => {
              const valueLabel = getValueLabel(game);
              const hasHltb    = game.hltb?.completionist != null && game.hltb.completionist > 0;

              return (
                <div
                  key={game.id}
                  className="bg-[#1a1a1a] border border-[#333333] rounded-lg overflow-hidden hover:border-[#5a7fa3] hover:shadow-lg hover:shadow-[#5a7fa3]/10 transition-all duration-300"
                >
                  <div className="p-6 space-y-4">
                    {/* Name */}
                    <h4 className="text-[#e5e5e5] font-bold text-lg line-clamp-2 min-h-[3.5rem]">{game.name}</h4>

                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#696969] text-xs mb-1 uppercase tracking-wider">Current Price</p>
                        <p className="text-[#7aaa8a] text-2xl font-bold">₹{game.currentPrice.toFixed(2)}</p>
                      </div>
                      {game.discountPercent > 0 && (
                        <div className="px-3 py-2 bg-[#8b3a3a]/20 border border-[#a84a4a] text-[#a84a4a] text-sm font-bold rounded-lg">
                          -{game.discountPercent}%
                        </div>
                      )}
                    </div>

                    {/* HLTB hours */}
                    {hasHltb && (
                      <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[#333333] space-y-1.5">
                        <p className="text-[#a0a0a0] text-xs font-semibold uppercase tracking-wider mb-2">
                          How Long to Beat
                          {game.hltb.matchedName && game.hltb.matchedName !== game.name && (
                            <span className="ml-1 text-[#696969] normal-case">· {game.hltb.matchedName}</span>
                          )}
                        </p>
                        {game.hltb.main != null && game.hltb.main > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-[#696969]">Main story</span>
                            <span className="text-[#e5e5e5] font-medium">{game.hltb.main}h</span>
                          </div>
                        )}
                        {game.hltb.extra != null && game.hltb.extra > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-[#696969]">Main + extras</span>
                            <span className="text-[#e5e5e5] font-medium">{game.hltb.extra}h</span>
                          </div>
                        )}
                        {game.hltb.completionist != null && game.hltb.completionist > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-[#696969]">Completionist</span>
                            <span className="text-[#f0b050] font-semibold">{game.hltb.completionist}h</span>
                          </div>
                        )}
                        {valueLabel && (
                          <div className={`text-xs font-semibold mt-1 ${valueLabel.color === 'text-green-400' ? 'text-[#7aaa8a]' : valueLabel.color === 'text-blue-400' ? 'text-[#5a7fa3]' : 'text-[#a0a0a0]'}`}>
                            {valueLabel.text} · ₹{(game.currentPrice / (game.hltb.completionist || 1)).toFixed(1)}/hr
                          </div>
                        )}
                      </div>
                    )}

                    {/* Score bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#a0a0a0] text-sm font-medium">Recommendation Score</span>
                        <span className="text-[#e5e5e5] text-lg font-bold">{game.finalScore}/100</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#5a7fa3] rounded-full transition-all duration-500"
                          style={{ width: `${game.finalScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Score breakdown */}
                    <div className="space-y-1.5 p-4 bg-[#1a1a1a] rounded-lg border border-[#333333]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#a0a0a0]">Discount:</span>
                        <span className="text-[#e5e5e5] font-semibold">{game.breakdown.discountScore}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#a0a0a0]">Value (HLTB):</span>
                        <span className="text-[#e5e5e5] font-semibold">{game.breakdown.valueScore}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#a0a0a0]">Tag match:</span>
                        <span className="text-[#e5e5e5] font-semibold">{game.breakdown.tagMatchScore}</span>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div>
                      <p className="text-[#a0a0a0] text-xs font-medium mb-2 uppercase tracking-wider">Why Recommended</p>
                      <div className="flex flex-wrap gap-1.5">
                        {game.reasoning.map((reason, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-[#5a7fa3]/20 border border-[#5a7fa3] text-[#7a9fc3] text-xs rounded-lg font-medium"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    {game.tags.length > 0 && (
                      <div className="border-t border-[#333333] pt-4">
                        <div className="flex flex-wrap gap-1.5">
                          {game.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-1 bg-[#1a1a1a] border border-[#333333] text-[#a0a0a0] text-xs rounded-lg"
                            >
                              {tag}
                            </span>
                          ))}
                          {game.tags.length > 3 && (
                            <span className="px-2.5 py-1 bg-[#1a1a1a] border border-[#333333] text-[#696969] text-xs rounded-lg">
                              +{game.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-40">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-[#2a2a2a] border-t-[#5a7fa3] rounded-full animate-spin" />
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-[#7a9fc3] rounded-full animate-spin" style={{ animationDelay: '150ms' }} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && selectedGames.length === 0 && !error && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md mx-auto px-6">
            <h3 className="text-2xl font-bold text-[#e5e5e5] mb-3">Ready to Optimize</h3>
            <p className="text-[#a0a0a0] mb-4">
              Enter your budget and click "Run Recommendation" to get optimal game suggestions
            </p>
            <p className="text-sm text-[#696969]">
              Make sure you have games in your wishlist with prices set
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecommendationSystem;
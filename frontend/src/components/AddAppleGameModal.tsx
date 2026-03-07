import { useState } from 'react';
import steamService from '../services/steam.service';

interface AddAppleGameModalProps {
  userId: string;
  onAdd: () => Promise<void>;
  onClose: () => void;
}

export function AddAppleGameModal({ userId, onAdd, onClose }: AddAppleGameModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    status: 'playing',
    rating: 0,
    review: '',
    tags: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      alert('Error: User ID is missing. Please reload and try again.');
      return;
    }

    setSaving(true);

    try {
      const gameData = {
        userId,
        platform: 'apple_gc' as const,
        platformGameId: `apple_${Date.now()}`,
        name: formData.name,
        playtimeForever: 0,
        status: formData.status,
        rating: formData.rating > 0 ? formData.rating : undefined,
        review: formData.review || undefined,
        userTags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        platformData: {
          addedManually: true,
          addedAt: new Date().toISOString(),
        },
      };

      await steamService.addManualGame(gameData);
      
      await onAdd();
      
      onClose();
    } catch (err) {
      console.error('Failed to add game:', err);
      alert('Failed to add game. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-700 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          Add Apple Game
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Game Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
              placeholder="Clash of Clans"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg border border-slate-700"
            >
              <option value="playing">Playing</option>
              <option value="completed">Completed</option>
              <option value="backlog">Backlog</option>
              <option value="unplayed">Unplayed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className={`w-12 h-12 rounded-lg text-2xl transition-all ${
                    formData.rating >= star
                      ? 'bg-yellow-500 text-white'
                      : 'bg-slate-800 text-gray-600 hover:bg-slate-700'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
              placeholder="strategy, multiplayer, mobile"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Review</label>
            <textarea
              value={formData.review}
              onChange={(e) => setFormData({ ...formData, review: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
              rows={4}
              placeholder="Your thoughts on this game..."
              maxLength={2000}
            />
            <div className="text-xs text-gray-400 mt-1">{formData.review.length}/2000</div>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-300">
              Note: Playtime tracking is not available for Apple Game Center games
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 font-semibold"
            >
              {saving ? 'Adding...' : 'Add Game'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
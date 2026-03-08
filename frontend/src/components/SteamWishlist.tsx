import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface WishlistItem {
  id: string;
  name: string;
  tags: string[];
  listPrice: number;
  currentPrice: number;
  discountPercent: number;
  createdAt: string;
}

interface SteamWishlistProps {
  userId: string;
}

function SteamWishlist({ userId }: SteamWishlistProps) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    tags: '',
    listPrice: '',
    currentPrice: '',
  });

  useEffect(() => {
    loadWishlist();
  }, [userId]);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/wishlist/${userId}`);
      setItems(response.data.items || []);
    } catch (_) {
      console.error('Failed to load wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
    const listPrice = parseFloat(formData.listPrice);
    const currentPrice = parseFloat(formData.currentPrice);

    if (!formData.name || isNaN(listPrice) || isNaN(currentPrice)) {
      setError('Please fill all fields correctly');
      return;
    }

    try {
      if (editingId) {
        await axios.patch(`${API_URL}/api/wishlist/${userId}/${editingId}`, {
          name: formData.name,
          tags,
          listPrice,
          currentPrice,
        });
      } else {
        await axios.post(`${API_URL}/api/wishlist/${userId}`, {
          name: formData.name,
          tags,
          listPrice,
          currentPrice,
        });
      }

      setFormData({ name: '', tags: '', listPrice: '', currentPrice: '' });
      setShowAddForm(false);
      setEditingId(null);
      loadWishlist();
    } catch (error) {
      console.error('Failed to save wishlist item:', error);
      setError('Failed to save item');
    }
  };

  const handleEdit = (item: WishlistItem) => {
    setFormData({
      name: item.name,
      tags: item.tags.join(', '),
      listPrice: item.listPrice.toString(),
      currentPrice: item.currentPrice.toString(),
    });
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;

    try {
      await axios.delete(`${API_URL}/api/wishlist/${userId}/${id}`);
      loadWishlist();
    } catch (error) {
      console.error('Failed to delete item:', error);
      setError('Failed to delete item');
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', tags: '', listPrice: '', currentPrice: '' });
    setShowAddForm(false);
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-slate-800/50 border-t-blue-500 rounded-full animate-spin" />
          <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" style={{ animationDelay: '150ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Steam Wishlist</h2>
          <p className="text-gray-400 text-sm">Manage your wishlist games and track prices</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-blue-600/20 backdrop-blur-2xl border border-blue-500/30 text-white font-semibold rounded-xl hover:bg-blue-600/30 hover:scale-[1.02] transition-all duration-300 shadow-lg"
          >
            + Add Game
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-slate-900/50 backdrop-blur-2xl border border-slate-800/50 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? 'Edit Game' : 'Add New Game'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm text-white rounded-xl border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-300"
                placeholder="Game name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Tags (comma-separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm text-white rounded-xl border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-300"
                placeholder="Action, RPG, Multiplayer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">List Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.listPrice}
                  onChange={(e) => setFormData({ ...formData, listPrice: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm text-white rounded-xl border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-300"
                  placeholder="999"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Current Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.currentPrice}
                  onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm text-white rounded-xl border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-300"
                  placeholder="699"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-green-600/20 backdrop-blur-sm border border-green-500/30 text-green-300 font-semibold rounded-xl hover:bg-green-600/30 hover:scale-[1.02] transition-all duration-300"
              >
                {editingId ? 'Update' : 'Add'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 text-white font-semibold rounded-xl hover:bg-slate-700/50 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Wishlist Table */}
      {items.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center mx-auto px-6">
            <p className="text-gray-400 text-lg font-medium mb-2">Your wishlist is empty</p>
            <p className="text-sm text-gray-500">Click "Add Game" to get started</p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/50 backdrop-blur-2xl rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 backdrop-blur-2xl border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Tags</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">List Price</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Current Price</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Discount</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`border-b border-slate-800/50 transition-all duration-300 ${
                      index % 2 === 0 ? 'bg-slate-900/30 hover:bg-slate-800/50' : 'bg-slate-900/20 hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="px-6 py-4 text-white font-medium">{item.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 flex-wrap">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-slate-800/50 backdrop-blur-sm rounded-full border border-slate-700/50 text-xs font-medium text-gray-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400 font-medium">
                      ₹{item.listPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-green-400 font-semibold text-lg">
                      ₹{item.currentPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.discountPercent > 0 ? (
                        <span className="px-3 py-1.5 bg-green-600/20 backdrop-blur-sm border border-green-500/30 text-green-300 text-sm font-bold rounded-lg">
                          -{item.discountPercent}%
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="px-4 py-2 bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 text-blue-300 text-xs font-semibold rounded-lg hover:bg-blue-600/30 transition-all duration-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-4 py-2 bg-red-600/20 backdrop-blur-sm border border-red-500/30 text-red-300 text-xs font-semibold rounded-lg hover:bg-red-600/30 transition-all duration-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SteamWishlist;
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface WishlistItem {
  id: string;
  appId: string;
  name: string;
  tags: string[];
  listPrice: number;
  currentPrice: number;
  discountPercent: number | null;
  imageUrl: string | null;
  createdAt: string;
}

interface SteamWishlistProps {
  userId: string;
}

function SteamWishlist({}: SteamWishlistProps) {
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
    imageUrl: '',
  });

  // Get auth token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  };

  // Generate unique appId from name
  const generateAppId = (name: string) => {
    // Create a unique ID from name + timestamp
    const timestamp = Date.now();
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `manual_${cleanName}_${timestamp}`;
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/wishlist`, getAuthHeaders());
      setItems(response.data.data || response.data.wishlist || []);
    } catch (err: any) {
      console.error('Failed to load wishlist:', err);
      setError(err.response?.data?.error || 'Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const tags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
    const listPrice = parseFloat(formData.listPrice);
    const currentPrice = parseFloat(formData.currentPrice);

    if (!formData.name || isNaN(listPrice) || isNaN(currentPrice)) {
      setError('Please fill all required fields correctly');
      return;
    }

    try {
      if (editingId) {
        // Update existing item
        await axios.patch(
          `${API_URL}/api/wishlist/item/${editingId}`, 
          {
            name: formData.name,
            tags,
            listPrice,
            currentPrice,
            imageUrl: formData.imageUrl || null,
          },
          getAuthHeaders()
        );
      } else {
        // Create new item with auto-generated appId
        const appId = generateAppId(formData.name);
        
        await axios.post(
          `${API_URL}/api/wishlist/item`,
          {
            appId,
            name: formData.name,
            tags,
            listPrice,
            currentPrice,
            imageUrl: formData.imageUrl || null,
          },
          getAuthHeaders()
        );
      }

      setFormData({ name: '', tags: '', listPrice: '', currentPrice: '', imageUrl: '' });
      setShowAddForm(false);
      setEditingId(null);
      await loadWishlist();
    } catch (err: any) {
      console.error('Failed to save wishlist item:', err);
      setError(err.response?.data?.error || 'Failed to save item');
    }
  };

  const handleEdit = (item: WishlistItem) => {
    setFormData({
      name: item.name,
      tags: item.tags.join(', '),
      listPrice: item.listPrice.toString(),
      currentPrice: item.currentPrice.toString(),
      imageUrl: item.imageUrl || '',
    });
    setEditingId(item.id);
    setShowAddForm(true);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;

    setError(null);
    try {
      await axios.delete(`${API_URL}/api/wishlist/item/${id}`, getAuthHeaders());
      await loadWishlist();
    } catch (err: any) {
      console.error('Failed to delete item:', err);
      setError(err.response?.data?.error || 'Failed to delete item');
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', tags: '', listPrice: '', currentPrice: '', imageUrl: '' });
    setShowAddForm(false);
    setEditingId(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-[#2a2a2a] border-t-[#5a7fa3] rounded-full animate-spin" />
          <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-[#7a9fc3] rounded-full animate-spin" style={{ animationDelay: '150ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-3xl font-bold text-[#e5e5e5] mb-2">Wishlist</h2>
          <p className="text-[#a0a0a0] text-sm">Track games you want to buy and monitor their prices</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-[#5a7fa3] hover:bg-[#7a9fc3] border border-[#5a7fa3] text-[#e5e5e5] font-semibold rounded-lg hover:scale-[1.02] transition-all duration-300"
          >
            + Add Game
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-[#8b3a3a] border border-[#a84a4a] rounded-lg p-4">
          <p className="text-[#ff9999] text-sm">{error}</p>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#e5e5e5] mb-4">
            {editingId ? 'Edit Game' : 'Add New Game'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#a0a0a0] mb-2">
                Game Name <span className="text-[#ff9999]">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333333] text-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5a7fa3]/20 focus:border-[#5a7fa3] transition-all duration-300"
                placeholder="e.g., Elden Ring"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a0a0a0] mb-2">Tags (comma-separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333333] text-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5a7fa3]/20 focus:border-[#5a7fa3] transition-all duration-300"
                placeholder="Action, RPG, Souls-like"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a0a0a0] mb-2">Cover Image URL (optional)</label>
              <input
                type="text"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333333] text-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5a7fa3]/20 focus:border-[#5a7fa3] transition-all duration-300"
                placeholder="https://example.com/game-cover.jpg"
              />
              <p className="text-xs text-[#696969] mt-1">
                Paste a direct link to the game's cover image
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#a0a0a0] mb-2">
                  List Price (₹) <span className="text-[#ff9999]">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.listPrice}
                  onChange={(e) => setFormData({ ...formData, listPrice: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333333] text-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5a7fa3]/20 focus:border-[#5a7fa3] transition-all duration-300"
                  placeholder="2999"
                  required
                />
                <p className="text-xs text-[#696969] mt-1">Original price</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#a0a0a0] mb-2">
                  Current Price (₹) <span className="text-[#ff9999]">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.currentPrice}
                  onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333333] text-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5a7fa3]/20 focus:border-[#5a7fa3] transition-all duration-300"
                  placeholder="1499"
                  required
                />
                <p className="text-xs text-[#696969] mt-1">Sale or current price</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-[#5a8a6a] hover:bg-[#7aaa8a] border border-[#5a8a6a] text-[#e5e5e5] font-semibold rounded-lg transition-all duration-300"
              >
                {editingId ? 'Update' : 'Add to Wishlist'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 bg-[#1a1a1a] border border-[#333333] text-[#e5e5e5] font-semibold rounded-lg hover:bg-[#2a2a2a] transition-all duration-300"
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
            <p className="text-[#a0a0a0] text-lg font-medium mb-2">Your wishlist is empty</p>
            <p className="text-sm text-[#696969]">Add games you're interested in to track their prices</p>
          </div>
        </div>
      ) : (
        <div className="bg-[#1a1a1a] rounded-lg border border-[#333333] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1a1a1a] border-b border-[#333333]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#a0a0a0]">Game</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#a0a0a0]">Tags</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-[#a0a0a0]">List Price</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-[#a0a0a0]">Current Price</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-[#a0a0a0]">Discount</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-[#a0a0a0]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const discount = item.discountPercent || 
                    (item.listPrice > 0 ? Math.round(((item.listPrice - item.currentPrice) / item.listPrice) * 100) : 0);
                  
                  return (
                    <tr 
                      key={item.id} 
                      className={`border-b border-[#333333] transition-all duration-300 ${
                        index % 2 === 0 ? 'bg-[#1a1a1a] hover:bg-[#2a2a2a]' : 'bg-[#000000] hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {item.imageUrl && (
                            <img 
                              src={item.imageUrl} 
                              alt={item.name}
                              className="w-12 h-12 rounded-lg object-cover border border-[#333333]"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <span className="text-[#e5e5e5] font-medium">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          {item.tags && item.tags.length > 0 ? (
                            item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-3 py-1 bg-[#1a1a1a] border border-[#333333] rounded-full text-xs font-medium text-[#a0a0a0]"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-[#696969] text-sm">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-[#a0a0a0] font-medium line-through">
                          ₹{item.listPrice.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-[#7aaa8a] font-semibold text-lg">
                          ₹{item.currentPrice.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {discount > 0 ? (
                          <span className="px-3 py-1.5 bg-[#5a8a6a] border border-[#7aaa8a] text-[#e5e5e5] text-sm font-bold rounded-lg">
                            -{discount}%
                          </span>
                        ) : (
                          <span className="text-[#696969]">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="px-4 py-2 bg-[#5a7fa3] hover:bg-[#7a9fc3] border border-[#5a7fa3] text-[#e5e5e5] text-xs font-semibold rounded-lg transition-all duration-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="px-4 py-2 bg-[#8b3a3a] hover:bg-[#9b4a4a] border border-[#a84a4a] text-[#ff9999] text-xs font-semibold rounded-lg transition-all duration-300"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SteamWishlist;

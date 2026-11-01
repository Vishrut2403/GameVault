import { useEffect, useState } from 'react';
import axios from 'axios';

import api, { API_BASE_URL as API_URL, errorMessage } from '../services/api';
import { useCachedGet, WISHLIST_URL } from '../services/cachedGet';

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

function SteamWishlist() {
	const { data, error: loadError, loading, reload: loadWishlist } = useCachedGet<{ data?: WishlistItem[]; wishlist?: WishlistItem[]; nextSyncAt?: number | null }>(WISHLIST_URL);
	const items = data?.data || data?.wishlist || [];
	const [showAddForm, setShowAddForm] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [syncing, setSyncing] = useState(false);
	const [syncNote, setSyncNote] = useState<string | null>(null);
	// The server reports when the next manual sync is allowed.
	const [lockedUntil, setLockedUntil] = useState(0);
	const [now, setNow] = useState(() => Date.now());
	const cooldownUntil = Math.max(data?.nextSyncAt ?? 0, lockedUntil);
	const coolingDown = cooldownUntil > now;

	// Tick while cooling down, so the countdown updates and the button re-enables on time.
	useEffect(() => {
		if (cooldownUntil <= now) return;
		const id = setTimeout(() => setNow(Date.now()), Math.min(30_000, cooldownUntil - now));
		return () => clearTimeout(id);
	}, [cooldownUntil, now]);
	
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
		} catch (err) {
			console.error('Failed to save wishlist item:', err);
			setError(errorMessage(err, 'Failed to save item'));
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
		} catch (err) {
			console.error('Failed to delete item:', err);
			setError(errorMessage(err, 'Failed to delete item'));
		}
	};

	const handleCancel = () => {
		setFormData({ name: '', tags: '', listPrice: '', currentPrice: '', imageUrl: '' });
		setShowAddForm(false);
		setEditingId(null);
		setError(null);
	};

	const handleSync = async () => {
		setSyncing(true);
		setError(null);
		setSyncNote(null);
		try {
			const { data } = await api.post('/wishlist/sync');
			setSyncNote(`Synced ${data.synced} ${data.synced === 1 ? 'game' : 'games'} from your Steam wishlist${data.removed ? `, removed ${data.removed}` : ''}.`);
			setLockedUntil(data.nextSyncAt ?? 0);
			await loadWishlist();
		} catch (err) {
			setError(errorMessage(err, 'Failed to sync from Steam'));
			if (axios.isAxiosError(err) && err.response?.data?.nextSyncAt) setLockedUntil(err.response.data.nextSyncAt);
		} finally {
			setSyncing(false);
			setNow(Date.now());
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-40">
				<div className="relative">
					<div className="w-20 h-20 border-4 border-line border-t-accent-line rounded-full animate-spin" />
					<div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-accent-hi-line rounded-full animate-spin" style={{ animationDelay: '150ms' }} />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="nb-pagehead flex items-center justify-between mb-2">
				<div>
					<h2 className="text-3xl font-bold text-ink mb-2">Wishlist</h2>
					<p className="text-muted text-sm">Synced from your Steam wishlist every night, with current prices. Add games that aren't on Steam by hand.</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<button
						onClick={handleSync}
						disabled={syncing || coolingDown}
						title={coolingDown ? 'Steam syncs are limited to one every 10 minutes' : undefined}
						className="px-6 py-3 bg-surface hover:bg-raised border border-line text-ink font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface"
					>
						{syncing
							? 'Syncing…'
							: coolingDown
								? `Synced · again in ${Math.ceil((cooldownUntil - now) / 60_000)} min`
								: 'Sync from Steam'}
					</button>
					{!showAddForm && (
						<button
							onClick={() => setShowAddForm(true)}
							className="px-6 py-3 bg-accent hover:bg-accent-hi border border-accent-line text-ink font-semibold rounded-lg hover:scale-[1.02] transition-all duration-300"
						>
							+ Add Game
						</button>
					)}
				</div>
			</div>

			{syncNote && <p className="text-ok-fg text-sm">{syncNote}</p>}

			{/* Error Message */}
			{(error || loadError !== null) && (
				<div className="bg-danger border border-danger-line rounded-lg p-4">
					<p className="text-danger-fg text-sm">{error || errorMessage(loadError, 'Failed to load wishlist')}</p>
				</div>
			)}

			{/* Add/Edit Form */}
			{showAddForm && (
				<div className="nb-panel nb-bar-pink bg-surface border border-line rounded-lg p-6">
					<h3 className="nb-title text-lg font-semibold text-ink mb-4">
						{editingId ? 'Edit Game' : 'Add New Game'}
					</h3>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-muted mb-2">
								Game Name <span className="text-danger-fg">*</span>
							</label>
							<input
								type="text"
								value={formData.name}
								onChange={(e) => setFormData({ ...formData, name: e.target.value })}
								className="w-full px-4 py-3 bg-surface border border-line text-ink rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-line/20 focus:border-accent-line transition-all duration-300"
								placeholder="e.g., Elden Ring"
								required
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-muted mb-2">Tags (comma-separated)</label>
							<input
								type="text"
								value={formData.tags}
								onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
								className="w-full px-4 py-3 bg-surface border border-line text-ink rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-line/20 focus:border-accent-line transition-all duration-300"
								placeholder="Action, RPG, Souls-like"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-muted mb-2">Cover Image URL (optional)</label>
							<input
								type="text"
								value={formData.imageUrl}
								onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
								className="w-full px-4 py-3 bg-surface border border-line text-ink rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-line/20 focus:border-accent-line transition-all duration-300"
								placeholder="https://example.com/game-cover.jpg"
							/>
							<p className="text-xs text-faint mt-1">
								Paste a direct link to the game's cover image
							</p>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-muted mb-2">
									List Price (₹) <span className="text-danger-fg">*</span>
								</label>
								<input
									type="number"
									step="0.01"
									min="0"
									value={formData.listPrice}
									onChange={(e) => setFormData({ ...formData, listPrice: e.target.value })}
									className="w-full px-4 py-3 bg-surface border border-line text-ink rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-line/20 focus:border-accent-line transition-all duration-300"
									placeholder="2999"
									required
								/>
								<p className="text-xs text-faint mt-1">Original price</p>
							</div>

							<div>
								<label className="block text-sm font-medium text-muted mb-2">
									Current Price (₹) <span className="text-danger-fg">*</span>
								</label>
								<input
									type="number"
									step="0.01"
									min="0"
									value={formData.currentPrice}
									onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
									className="w-full px-4 py-3 bg-surface border border-line text-ink rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-line/20 focus:border-accent-line transition-all duration-300"
									placeholder="1499"
									required
								/>
								<p className="text-xs text-faint mt-1">Sale or current price</p>
							</div>
						</div>

						<div className="flex gap-3">
							<button
								type="submit"
								className="flex-1 px-6 py-3 bg-ok hover:bg-ok-hi border border-ok-line text-ink font-semibold rounded-lg transition-all duration-300"
							>
								{editingId ? 'Update' : 'Add to Wishlist'}
							</button>
							<button
								type="button"
								onClick={handleCancel}
								className="px-6 py-3 bg-surface border border-line text-ink font-semibold rounded-lg hover:bg-raised transition-all duration-300"
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
						<p className="text-muted text-lg font-medium mb-2">Your wishlist is empty</p>
						<p className="text-sm text-faint">Add games you're interested in to track their prices</p>
					</div>
				</div>
			) : (
				<div className="bg-surface rounded-lg border border-line overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="nb-thead bg-surface border-b border-line">
								<tr>
									<th className="px-6 py-4 text-left text-sm font-semibold text-muted">Game</th>
									<th className="px-6 py-4 text-left text-sm font-semibold text-muted">Tags</th>
									<th className="px-6 py-4 text-right text-sm font-semibold text-muted">List Price</th>
									<th className="px-6 py-4 text-right text-sm font-semibold text-muted">Current Price</th>
									<th className="px-6 py-4 text-center text-sm font-semibold text-muted">Discount</th>
									<th className="px-6 py-4 text-center text-sm font-semibold text-muted">Actions</th>
								</tr>
							</thead>
							<tbody>
								{items.map((item, index) => {
									const discount = item.discountPercent || 
										(item.listPrice > 0 ? Math.round(((item.listPrice - item.currentPrice) / item.listPrice) * 100) : 0);
									// Hand-added games get a made-up `manual_…` id; everything else came from Steam.
									const fromSteam = !item.appId.startsWith('manual_');
									const unpriced = fromSteam && item.listPrice === 0 && item.currentPrice === 0;
									
									return (
										<tr 
											key={item.id} 
											className={`border-b border-line transition-all duration-300 ${
												index % 2 === 0 ? 'bg-surface hover:bg-raised' : 'bg-panel hover:bg-surface'
											}`}
										>
											<td className="px-6 py-4">
												<div className="flex items-center gap-3">
													{item.imageUrl && (
														<img 
															src={item.imageUrl} 
															alt={item.name}
															className="w-12 h-12 rounded-lg object-cover border border-line"
															onError={(e) => {
																(e.target as HTMLImageElement).style.display = 'none';
															}}
														/>
													)}
													<span className="text-ink font-medium">{item.name}</span>
													{fromSteam && (
														<span className="px-2 py-0.5 bg-raised border border-line rounded text-xs font-semibold text-muted">Steam</span>
													)}
												</div>
											</td>
											<td className="px-6 py-4">
												<div className="flex gap-2 flex-wrap">
													{item.tags && item.tags.length > 0 ? (
														item.tags.map((tag) => (
															<span
																key={tag}
																className="px-3 py-1 bg-surface border border-line rounded-full text-xs font-medium text-muted"
															>
																{tag}
															</span>
														))
													) : (
														<span className="text-faint text-sm">-</span>
													)}
												</div>
											</td>
											<td className="px-6 py-4 text-right">
												{unpriced ? (
													<span className="text-faint">-</span>
												) : (
													<span className={`text-muted font-medium ${discount > 0 ? 'line-through' : ''}`}>
														₹{item.listPrice.toFixed(2)}
													</span>
												)}
											</td>
											<td className="px-6 py-4 text-right">
												{unpriced ? (
													<span className="text-faint text-sm">Not priced yet</span>
												) : (
													<span className="text-ok-fg font-semibold text-lg">
														₹{item.currentPrice.toFixed(2)}
													</span>
												)}
											</td>
											<td className="px-6 py-4 text-center">
												{discount > 0 ? (
													<span className="px-3 py-1.5 bg-ok border border-ok-line text-ink text-sm font-bold rounded-lg">
														-{discount}%
													</span>
												) : (
													<span className="text-faint">-</span>
												)}
											</td>
											<td className="px-6 py-4 text-center">
												<div className="flex items-center justify-center gap-2">
													{fromSteam ? (
														<a
															href={`https://store.steampowered.com/app/${item.appId}`}
															target="_blank"
															rel="noopener noreferrer"
															title="Synced from Steam: remove it from your wishlist on Steam"
															className="px-4 py-2 bg-surface hover:bg-raised border border-line text-ink text-xs font-semibold rounded-lg transition-all duration-300"
														>
															Store ↗
														</a>
													) : (<>
													<button
														onClick={() => handleEdit(item)}
														className="px-4 py-2 bg-accent hover:bg-accent-hi border border-accent-line text-ink text-xs font-semibold rounded-lg transition-all duration-300"
													>
														Edit
													</button>
													<button
														onClick={() => handleDelete(item.id)}
														className="px-4 py-2 bg-danger hover:bg-danger-hi border border-danger-line text-danger-fg text-xs font-semibold rounded-lg transition-all duration-300"
													>
														Delete
													</button>
													</>)}
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

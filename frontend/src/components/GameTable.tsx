import { useState } from 'react';
import steamService from '../services/steam.service';
import { PlatformBadge } from './PlatformBadge';
import type { LibraryGame } from '../types/games.types';
import { getGameImage } from '../utils/gameHelpers';

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
			await steamService.updateGamePrice(steamId, game.platformGameId, price);

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
			await steamService.updateGameTags(steamId, game.platformGameId, tags);

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
		if (!rating) return 'text-muted';
		if (rating >= 90) return 'text-accent-hi-fg';
		if (rating >= 80) return 'text-accent-hi-fg';
		if (rating >= 70) return 'text-muted';
		return 'text-muted';
	};

	const formatRating = (game: LibraryGame) => {
		if (!game.rating) return '-';
		const percentage = (game.rating / 5) * 100;
		return `${percentage.toFixed(2)}%`;
	};

	return (
		<div className="bg-surface rounded-lg border border-line overflow-hidden">
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead className="bg-panel border-b border-line">
						<tr>
							<th className="px-6 py-4 text-left text-sm font-semibold text-muted">Name</th>
							<th className="px-6 py-4 text-right text-sm font-semibold text-muted">Price/Hour</th>
							<th className="px-6 py-4 text-right text-sm font-semibold text-muted">Price</th>
							<th className="px-6 py-4 text-right text-sm font-semibold text-muted">Time</th>
							<th className="px-6 py-4 text-center text-sm font-semibold text-muted">Rating</th>
							<th className="px-6 py-4 text-left text-sm font-semibold text-muted">Tags</th>
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
								
							return (
								<tr
									key={game.id}
									className={`border-b border-line transition-all duration-200 ${
										index % 2 === 0 ? 'bg-surface hover:bg-subtle-hi' : 'bg-raised hover:bg-subtle-hi'
									}`}
								>
									{/* Name Column */}
									<td className="px-6 py-4">
										<div 
											className="flex items-center gap-4 cursor-pointer"
											onClick={() => onGameClick(game)}
										>
											<div className="relative w-24 h-14 rounded-md overflow-hidden flex-shrink-0 border border-line">
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
												<div className="text-ink font-medium mb-1">{game.name}</div>
												<div className="flex items-center gap-2">
													<PlatformBadge platform={game.platform} />
												</div>
											</div>
										</div>
									</td>

									{/* Price/Hour */}
									<td className="px-6 py-4 text-right">
										{game.pricePerHour && (game.playtimeForever || 0) > 0 ? (
											<span className={`font-semibold ${
												game.pricePerHour < 10 ? 'text-ok-fg' :
												game.pricePerHour < 50 ? 'text-warn-fg' : 
												'text-danger-fg'
											}`}>
												₹{game.pricePerHour.toFixed(2)}
											</span>
										) : (
											<span className="text-faint">-</span>
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
													className="w-24 px-3 py-1.5 bg-subtle border border-accent-line rounded text-ink text-sm text-right focus:outline-none focus:border-accent-hi-line"
													autoFocus
												/>
												<button
													onClick={() => handleSavePrice(game)}
													disabled={isSavingPriceField}
													className="px-3 py-1.5 bg-accent text-ink text-xs font-semibold rounded hover:bg-accent-hi transition-all duration-200 disabled:opacity-50"
												>
													{isSavingPriceField ? '...' : 'Save'}
												</button>
											</div>
										) : (
											<div className="flex items-center justify-end gap-2">
												<span className="text-ink font-medium">
													{game.pricePaid !== null && game.pricePaid !== undefined
														? `₹ ${game.pricePaid.toFixed(0)}`
														: 'Free'}
												</span>
												<button
													onClick={() =>
														setEditingPrice((prev) => ({
															...prev,
															[gameKey]: game.pricePaid?.toString() || '',
														}))
													}
													className="text-faint hover:text-accent-fg text-xs transition-colors"
												>
													✎
												</button>
											</div>
										)}
									</td>

									{/* Time */}
									<td className="px-6 py-4 text-right">
										<span className="text-ink font-medium">{hours}h</span>
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
													className="flex-1 px-3 py-1.5 bg-subtle border border-accent-line rounded text-ink text-sm focus:outline-none focus:border-accent-hi-line"
													autoFocus
												/>
												<button
													onClick={() => handleSaveTags(game)}
													disabled={isSavingTag}
													className="px-3 py-1.5 bg-accent text-ink text-xs font-semibold rounded hover:bg-accent-hi transition-all duration-200"
												>
													{isSavingTag ? '...' : 'Save'}
												</button>
											</div>
										) : (
											<div className="flex gap-2 flex-wrap items-center">
												{game.userTags?.map((tag) => (
													<span
														key={tag}
														className="px-3 py-1 bg-subtle rounded-full border border-line-strong text-xs font-medium text-muted"
													>
														{tag}
													</span>
												))}
												<button
													onClick={() => setEditingTags((prev) => ({
														...prev,
														[gameKey]: game.userTags?.join(', ') || '',
													}))}
													className="px-3 py-1 text-faint hover:text-accent-fg text-xs transition-colors"
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
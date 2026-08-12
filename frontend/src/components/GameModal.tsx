import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import steamService from '../services/steam.service';
import { PlatformBadge } from './PlatformBadge';
import { GameJournal } from './GameJournal';
import type { LibraryGame } from '../types/games.types';
import { getGameImage } from '../utils/gameHelpers';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface HltbData {
	gameplayMain:          number;
	gameplayMainExtra:     number;
	gameplayCompletionist: number;
	name:                  string;
}

interface PredictionData {
	estimatedDays: number;
	estimatedCompletionDate: string;
	confidence: number;
	reasoning: string;
	hltbEstimate?: number;
	hoursPlayed: number;
	hoursRemaining: number;
	estimatedTotalHours: number;
	avgHoursPerDay: number;
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
	const [currentRating, setCurrentRating] = useState(game.rating || 0);

	const [hltbData,    setHltbData]    = useState<HltbData | null>(null);
	const [hltbLoading, setHltbLoading] = useState(false);
	const [prediction,  setPrediction]  = useState<PredictionData | null>(null);
	const [predictionLoading, setPredictionLoading] = useState(false);

	useEffect(() => {
		setEditingReview(game.review || '');
		setEditingImage(game.imageUrl || '');
		setCurrentRating(game.rating || 0);
		setActiveTab('overview');
		setHltbData(null);
		setPrediction(null);
		fetchHltb();
	}, [game]);

	// Fetch prediction after HLTB data loads
	useEffect(() => {
		if (!hltbLoading) {
			fetchPrediction();
		}
	}, [hltbLoading, hltbData, game.id]);

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

	const fetchPrediction = useCallback(async () => {
		setPredictionLoading(true);
		try {
			const token = localStorage.getItem('token');
			let hltbHours = 0;
			
			// Use already-fetched HLTB data instead of refetching
			if (hltbData?.gameplayCompletionist) {
				hltbHours = hltbData.gameplayCompletionist;
			}

			const url = `${API_URL}/api/predictions/${game.id}${hltbHours ? `?hltbCompletionistMinutes=${hltbHours}` : ''}`;
			
			const res = await axios.post(
				url,
				{},
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);
			
			if (res.data.success && res.data.data) {
				const predData = res.data.data;
				setPrediction(predData);
			}
		} catch (error: any) {
			// Silently fail - prediction is optional, don't block UI if it fails
		} finally {
			setPredictionLoading(false);
		}
	}, [game.id, hltbData]);

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
			await steamService.updateGameStatus(steamId, game.platformGameId, status);
			await onUpdate();
		} catch {
			console.error('Failed to update status');
		}
	};

	const updateRating = async (rating: number) => {
		setCurrentRating(rating);
		try {
			await steamService.updateGameRating(steamId, game.platformGameId, rating);
			await onUpdate();
		} catch {
			console.error('Failed to update rating');
			setCurrentRating(game.rating || 0);
		}
	};

	const handleSaveReview = async () => {
		setSavingReview(true);
		try {
			await steamService.updateGameReview(steamId, game.platformGameId, editingReview);
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
			await steamService.updateGameImage(steamId, game.platformGameId, editingImage);
			await onUpdate();
		} catch {
			alert('Failed to save image');
		} finally {
			setSavingImage(false);
		}
	};

	const achievementPercentage = getAchievementPercentage();

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70"
			onClick={onClose}
		>
			<div
				className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#000000] rounded-lg shadow-lg border border-[#333333]"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Hero image */}
				<div className="relative h-80 overflow-hidden rounded-t-lg">
					<img src={getGameImage(game)} alt={game.name} className="w-full h-full object-cover" />
					<div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/40 to-transparent" />

					<button
						onClick={onClose}
						className="absolute top-6 right-6 w-12 h-12 bg-[#1a1a1a] rounded border border-[#333333] flex items-center justify-center text-[#e5e5e5] text-2xl hover:bg-[#333333] transition-all duration-200"
					>
						×
					</button>

					<div className="absolute top-6 left-6 flex items-center gap-3">
						<PlatformBadge platform={game.platform} />
						{is100Percent() && (
							<div className="px-3 py-1.5 bg-[#5a7fa3] rounded flex items-center gap-1.5">
								<span className="text-[#e5e5e5] text-lg">🏆</span>
								<span className="text-[#e5e5e5] text-xs font-semibold">100%</span>
							</div>
						)}
					</div>
				</div>

				{/* Tabs */}
				<div className="border-b border-[#333333] px-8 pt-4">
					<div className="flex gap-6">
						{(['overview', 'journal'] as TabType[]).map((tab) => (
							<button
								key={tab}
								onClick={() => setActiveTab(tab)}
								className={`pb-3 px-1 font-semibold transition-colors relative capitalize ${
									activeTab === tab ? 'text-[#5a7fa3]' : 'text-[#a0a0a0] hover:text-[#e5e5e5]'
								}`}
							>
								{tab === 'journal' ? 'Journal' : 'Overview'}
								{activeTab === tab && (
									<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5a7fa3]" />
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
								<h2 className="text-3xl font-bold text-[#e5e5e5] mb-2">{game.name}</h2>
							</div>

							{/* Playtime + Value */}
							<div className="grid grid-cols-2 gap-4">
								<div className="p-6 bg-[#1a1a1a] rounded-lg border border-[#333333]">
									<p className="text-xs uppercase tracking-wider text-[#a0a0a0] mb-2 font-semibold">Playtime</p>
									<p className="text-3xl font-bold text-[#e5e5e5]">
										{`${Math.round((game.playtimeForever || 0) / 60)}h`}
									</p>
								</div>

								{game.pricePerHour && (
									<div className="p-6 bg-[#1a1a1a] rounded-lg border border-[#333333]">
										<p className="text-xs uppercase tracking-wider text-[#a0a0a0] mb-2 font-semibold">Value</p>
										<p className="text-3xl font-bold text-[#7a9fc3]">₹{game.pricePerHour.toFixed(2)}/h</p>
									</div>
								)}
							</div>

							{/* ── HLTB Section ── */}
							<div className="p-6 bg-[#1a1a1a] rounded-lg border border-[#333333]">
								<div className="flex items-center justify-between mb-4">
									<p className="text-sm font-semibold text-[#a0a0a0]">How Long to Beat</p>
									{hltbLoading && (
										<span className="text-xs text-[#696969] animate-pulse">Fetching...</span>
									)}
									{!hltbLoading && hltbData && (
										<span className="text-xs text-[#696969] italic">{hltbData.name}</span>
									)}
								</div>

								{!hltbLoading && hltbData && (
									<div className="grid grid-cols-3 gap-3">
										{hltbData.gameplayMain > 0 && (
											<div className="p-3 bg-[#2a2a2a] rounded border border-[#5a5a5a] text-center">
												<p className="text-xs text-[#a0a0a0] mb-1">Main story</p>
												<p className="text-xl font-bold text-[#e5e5e5]">{hltbData.gameplayMain}h</p>
											</div>
										)}
										{hltbData.gameplayMainExtra > 0 && (
											<div className="p-3 bg-[#2a2a2a] rounded border border-[#5a5a5a] text-center">
												<p className="text-xs text-[#a0a0a0] mb-1">Main + extras</p>
												<p className="text-xl font-bold text-[#7a9fc3]">{hltbData.gameplayMainExtra}h</p>
											</div>
										)}
										{hltbData.gameplayCompletionist > 0 && (
											<div className="p-3 bg-[#2a2a2a] rounded border border-[#5a5a5a] text-center">
												<p className="text-xs text-[#a0a0a0] mb-1">Completionist</p>
												<p className="text-xl font-bold text-[#a0a0a0]">{hltbData.gameplayCompletionist}h</p>
											</div>
										)}
									</div>
								)}

								{!hltbLoading && !hltbData && (
									<p className="text-xs text-[#696969]">No HLTB data found for "{game.name}".</p>
								)}
							</div>

							{/* ── Time-to-Complete Prediction ── */}
					{prediction && hltbData && !is100Percent() && (
								<div className="p-6 bg-gradient-to-r from-[#1a1a1a] to-[#252525] rounded-lg border border-[#5a7fa3]/30">
									<p className="text-sm font-semibold text-[#a0a0a0] mb-3">Estimated Completion</p>
									
									<div className="flex items-stretch gap-4 mb-4">
										{/* Hours breakdown */}
										<div className="flex-1 flex items-center justify-between gap-4 p-3 bg-[#2a2a2a] rounded border border-[#5a5a5a]">
											<div className="flex-1">
												<p className="text-xs text-[#a0a0a0]">Hours Played</p>
												<p className="text-lg font-bold text-[#7a9fc3]">{typeof prediction.hoursPlayed === 'number' && !isNaN(prediction.hoursPlayed) ? prediction.hoursPlayed : '?'}h</p>
											</div>
											<div className="flex-1">
												<p className="text-xs text-[#a0a0a0]">Hours Remaining</p>
												<p className="text-lg font-bold text-[#e5e5e5]">{typeof prediction.hoursRemaining === 'number' && !isNaN(prediction.hoursRemaining) ? prediction.hoursRemaining : '?'}h</p>
											</div>
											<div className="flex-1">
												<p className="text-xs text-[#a0a0a0]">Estimated Total</p>
												<p className="text-lg font-bold text-[#a0a0a0]">{typeof prediction.estimatedTotalHours === 'number' && !isNaN(prediction.estimatedTotalHours) ? prediction.estimatedTotalHours : '?'}h</p>
											</div>
											<div className="flex-1">
												<p className="text-xs text-[#a0a0a0]">Daily Pace</p>
												<p className="text-lg font-bold text-[#7a9fc3]">{typeof prediction.avgHoursPerDay === 'number' && !isNaN(prediction.avgHoursPerDay) ? prediction.avgHoursPerDay : '?'}h/day</p>
											</div>
										</div>

										{/* Days estimate - alongside hours */}
										<div className="flex-shrink-0 p-3 bg-[#1a3a4a] rounded border border-[#5a7fa3] flex flex-col justify-center items-center min-w-[140px]">
											<p className="text-2xl font-bold text-[#5a7fa3]">
												{prediction.estimatedDays} day{prediction.estimatedDays !== 1 ? 's' : ''}
											</p>
											<p className="text-xs text-[#696969]">
												Est. {new Date(prediction.estimatedCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
											</p>
										</div>
									</div>

									<div className="flex items-center justify-between">
										<p className="text-xs text-[#a0a0a0] leading-relaxed">
											{prediction.reasoning}
										</p>
										<span className="text-xs font-bold text-[#7a9fc3] bg-[#2a2a2a] px-3 py-1 rounded whitespace-nowrap">
											{Math.round(prediction.confidence * 100)}% confidence
										</span>
									</div>
								</div>
							)}

							{predictionLoading && (
								<div className="p-6 bg-[#1a1a1a] rounded-lg border border-[#333333]">
									<p className="text-xs text-[#696969] animate-pulse">Calculating your completion time...</p>
								</div>
							)}

							{/* Achievements */}
							{game.achievementsTotal && game.achievementsTotal > 0 && !is100Percent() && (
								<div className="p-6 bg-[#1a1a1a] rounded-lg border border-[#333333]">
									<div className="flex items-center justify-between mb-3">
										<p className="text-sm font-semibold text-[#a0a0a0]">Achievements</p>
										<p className="text-sm font-semibold text-[#e5e5e5]">
											{game.achievementsEarned || 0} / {game.achievementsTotal}
											<span className="text-[#a0a0a0] ml-2">({achievementPercentage}%)</span>
										</p>
									</div>
									<div className="h-3 bg-[#333333] rounded-full overflow-hidden">
										<div
											className="h-full bg-[#5a7fa3] transition-all duration-500"
											style={{ width: `${achievementPercentage}%` }}
										/>
									</div>
								</div>
							)}

							{/* Tags */}
							{game.userTags && game.userTags.length > 0 && (
								<div>
									<p className="text-sm font-semibold text-[#a0a0a0] mb-3">Tags</p>
									<div className="flex flex-wrap gap-2">
										{game.userTags.map((tag) => (
											<span
												key={tag}
												className="px-4 py-2 bg-[#1a1a1a] rounded border border-[#333333] text-sm font-medium text-[#a0a0a0]"
											>
												{tag}
											</span>
										))}
									</div>
								</div>
							)}

							{/* Review */}
							<div className="p-6 bg-[#1a1a1a] rounded-lg border border-[#333333]">
								<label className="block text-sm font-semibold text-[#a0a0a0] mb-3">Personal Review</label>
								<textarea
									value={editingReview}
									onChange={(e) => setEditingReview(e.target.value)}
									className="w-full h-32 px-4 py-3 bg-[#2a2a2a] rounded border border-[#333333] text-[#e5e5e5] placeholder-[#696969] resize-none focus:border-[#5a7fa3] outline-none transition-all duration-200"
									placeholder="Share your thoughts..."
									maxLength={2000}
								/>
								<div className="flex items-center justify-between mt-3">
									<span className="text-xs text-[#696969]">{editingReview.length}/2000</span>
									<button
										onClick={handleSaveReview}
										disabled={savingReview}
										className="px-6 py-2 bg-[#5a7fa3] rounded font-semibold hover:bg-[#7a9fc3] transition-all duration-200 disabled:opacity-50 text-[#e5e5e5]"
									>
										{savingReview ? 'Saving...' : 'Save Review'}
									</button>
								</div>
							</div>

							{/* Status */}
							<div>
								<p className="text-sm font-semibold text-[#a0a0a0] mb-3">Status</p>
								<div className="grid grid-cols-4 gap-3">
									{(['playing', 'completed', 'backlog', 'unplayed'] as const).map((status) => (
										<button
											key={status}
											onClick={() => updateStatus(status)}
											className={`px-4 py-3 rounded font-semibold capitalize transition-all duration-200 ${
												game.status === status
													? 'bg-[#5a7fa3] border border-[#7a9fc3] text-[#e5e5e5]'
													: 'bg-[#1a1a1a] border border-[#333333] text-[#a0a0a0] hover:bg-[#333333] hover:text-[#e5e5e5]'
											}`}
										>
											{status}
										</button>
									))}
								</div>
							</div>

							{/* Rating */}
							<div>
								<p className="text-sm font-semibold text-[#a0a0a0] mb-3">Rating</p>
								<div className="flex gap-3">
									{[1, 2, 3, 4, 5].map((star) => (
										<button
											key={star}
											onClick={() => updateRating(star)}
											className={`flex-1 h-16 rounded flex items-center justify-center text-3xl transition-all duration-200 ${
												currentRating >= star
													? 'bg-[#5a7fa3] text-[#e5e5e5]'
													: 'bg-[#1a1a1a] border border-[#333333] text-[#696969] hover:bg-[#333333]'
											}`}
										>
											★
										</button>
									))}
								</div>
							</div>

							{/* Cover image editor */}
							<div className="p-6 bg-[#1a1a1a] rounded-lg border border-[#333333]">
								<label className="block text-sm font-semibold text-[#a0a0a0] mb-3">Cover Image URL</label>
								<div className="flex gap-2">
									<input
										type="text"
										value={editingImage}
										onChange={(e) => setEditingImage(e.target.value)}
										className="flex-1 px-4 py-3 bg-[#2a2a2a] rounded border border-[#333333] text-[#e5e5e5] placeholder-[#696969] focus:border-[#5a7fa3] outline-none transition-all duration-200"
										placeholder="https://example.com/image.jpg"
									/>
									<button
										onClick={handleSaveImage}
										disabled={savingImage}
										className="px-6 py-3 bg-[#5a7fa3] rounded font-semibold hover:bg-[#7a9fc3] transition-all duration-200 disabled:opacity-50 text-[#e5e5e5] whitespace-nowrap"
									>
										{savingImage ? 'Saving...' : 'Update Image'}
									</button>
								</div>
								<p className="text-xs text-[#696969] mt-2">
									Enter a direct URL to an image (must start with http:// or https://)
								</p>
							</div>

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
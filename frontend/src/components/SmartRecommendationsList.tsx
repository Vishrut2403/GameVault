import { useEffect, useState } from 'react';
import api from '../services/api';

interface GameScore {
	gameId: string;
	name: string;
	score: number;
	reasons: string[];
	playtimeForever: number;
	rating: number | null;
	userTags: string[];
	platform: string;
	achievementRate: number;
}

interface SmartRecommendationsListProps {
	userId: string;
	limit?: number;
	onSelectGame?: (gameId: string) => void;
}

export default function SmartRecommendationsList({
	userId,
	limit = 5,
	onSelectGame,
}: SmartRecommendationsListProps) {
	const [recommendations, setRecommendations] = useState<GameScore[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchRecommendations = async () => {
			try {
				setLoading(true);
				setError(null);
				const response = await api.get(`/recommendations/${userId}/smart`, {
					params: { limit },
				});
				setRecommendations(response.data.recommendations || []);
			} catch (err) {
				console.error('Failed to fetch smart recommendations:', err);
				setError('Failed to load recommendations');
				setRecommendations([]);
			} finally {
				setLoading(false);
			}
		};

		if (userId) {
			fetchRecommendations();
		}
	}, [userId, limit]);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-spin rounded-full h-8 w-8 border border-blue-500 border-t-transparent"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 bg-red-900 bg-opacity-20 border border-red-600 rounded-lg text-red-400">
				{error}
			</div>
		);
	}

	if (recommendations.length === 0) {
		return (
			<div className="p-8 text-center text-gray-400">
				<p>No recommendations yet. Mark some games as Backlog and they'll be ranked here.</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold text-white">Recommended for You</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{recommendations.map((rec, index) => (
					<div
						key={rec.gameId}
						className="bg-gray-900 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors cursor-pointer"
						onClick={() => onSelectGame?.(rec.gameId)}
					>
						<div className="p-4">
							{/* Header with ranking and score */}
							<div className="flex items-start justify-between mb-2">
								<div className="flex items-center gap-2">
									<span className="text-2xl font-bold text-blue-400">#{index + 1}</span>
									<span className="text-sm text-gray-400">Match Score</span>
								</div>
								<div className="text-right">
									<div className="text-2xl font-bold text-green-400">{rec.score.toFixed(0)}</div>
									<div className="text-xs text-gray-500">/ 100</div>
								</div>
							</div>

							{/* Game name */}
							<h4 className="text-base font-semibold text-white mb-2 truncate">{rec.name}</h4>

							{/* Platform and rating */}
							<div className="flex items-center justify-between mb-3 text-xs text-gray-400">
								<span className="px-2 py-1 bg-gray-800 rounded">{rec.platform}</span>
								{rec.rating !== null && rec.rating > 0 && (
									<span className="text-yellow-400">★ {rec.rating.toFixed(1)}</span>
								)}
							</div>

							{/* Score bar */}
							<div className="w-full bg-gray-800 rounded-full h-2 mb-3">
								<div
									className="h-2 rounded-full transition-all"
									style={{
										width: `${rec.score}%`,
										backgroundColor:
											rec.score >= 75 ? '#4ddc4d' : rec.score >= 50 ? '#ffdd44' : '#ff6666',
									}}
								></div>
							</div>

							{/* Reasons */}
							<div className="text-xs text-gray-300 space-y-1 mb-3">
								{rec.reasons.slice(0, 2).map((reason, i) => (
									<div key={i} className="flex items-start gap-2">
										<span className="text-green-400 mt-0.5">✓</span>
										<span>{reason}</span>
									</div>
								))}
							</div>

							{/* Tags */}
							{rec.userTags && rec.userTags.length > 0 && (
								<div className="flex flex-wrap gap-1">
									{rec.userTags.slice(0, 3).map((tag) => (
										<span key={tag} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-300 rounded">
											{tag}
										</span>
									))}
									{rec.userTags.length > 3 && (
										<span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400">
											+{rec.userTags.length - 3}
										</span>
									)}
								</div>
							)}

							{/* Playtime info */}
							{rec.playtimeForever > 0 && (
								<div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
									<div>Total Playtime: {(rec.playtimeForever / 60).toFixed(1)}h</div>
									{rec.achievementRate > 0 && (
										<div className="mt-1">
											Achievements: {(rec.achievementRate * 100).toFixed(0)}%
										</div>
									)}
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

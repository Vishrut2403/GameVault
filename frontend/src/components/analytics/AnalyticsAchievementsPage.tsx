import { useMemo } from 'react';
import type { LibraryGame } from '../../types/games.types';
import { PlatformBadge } from '../PlatformBadge';

interface AnalyticsAchievementsPageProps {
	games: LibraryGame[];
}

export const AnalyticsAchievementsPage: React.FC<AnalyticsAchievementsPageProps> = ({ games }) => {
	
	const perfectGames = useMemo(() => {
		return games.filter(g => 
			g.achievementsTotal && 
			g.achievementsTotal > 0 && 
			g.achievementsEarned === g.achievementsTotal
		);
	}, [games]);
	
	const topProgress = useMemo(() => {
		return [...games]
			.filter(g => (g.achievementsTotal || 0) > 0)
			.map(g => ({
				...g,
				progress: Math.round(((g.achievementsEarned || 0) / (g.achievementsTotal || 1)) * 100)
			}))
			.sort((a, b) => {
				if (a.progress === 100 && b.progress !== 100) return 1;
				if (b.progress === 100 && a.progress !== 100) return -1;
				return b.progress - a.progress;
			})
			.slice(0, 8);
	}, [games]);

	return (
		<div className="space-y-8">
			{/* Achievement Progress Rings */}
			<div className="bg-surface border border-line rounded-lg p-6">
				<h3 className="text-xl font-bold text-ink mb-6">Achievement Progress</h3>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
					{topProgress.map((game, idx) => {
						const circumference = 2 * Math.PI * 45;
						const offset = circumference - (game.progress / 100) * circumference;
						
						return (
							<div key={idx} className="flex flex-col items-center">
								<div className="relative w-32 h-32 mb-3">
									<svg className="transform -rotate-90 w-32 h-32">
										{/* Background circle */}
										<circle
											cx="64"
											cy="64"
											r="45"
											stroke="var(--chart-track)"
											strokeWidth="8"
											fill="none"
										/>
										{/* Progress circle */}
										<circle
											cx="64"
											cy="64"
											r="45"
											stroke={game.progress === 100 ? '#10b981' : '#3b82f6'}
											strokeWidth="8"
											fill="none"
											strokeDasharray={circumference}
											strokeDashoffset={offset}
											strokeLinecap="round"
											className="transition-all duration-300"
										/>
									</svg>
									<div className="absolute inset-0 flex flex-col items-center justify-center">
										<span className="text-2xl font-bold text-ink">{game.progress}%</span>
										{game.progress === 100 && <span className="text-lg">🏆</span>}
									</div>
								</div>
								<div className="text-center">
									<div className="font-semibold text-ink text-sm mb-1 line-clamp-2">
										{game.name}
									</div>
									<div className="text-xs text-muted">
										{game.achievementsEarned}/{game.achievementsTotal}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
			
			{/* Perfect Games */}
			{perfectGames.length > 0 && (
				<div className="bg-surface border border-line rounded-lg p-6">
					<h3 className="text-xl font-bold text-ink mb-6">
						Perfect Games 🏆 ({perfectGames.length})
					</h3>
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
						{perfectGames.map((game, idx) => (
							<div 
								key={idx} 
								className="bg-raised rounded-lg overflow-hidden border border-line hover:border-ok-line transition-all group"
							>
								{game.imageUrl && (
									<div className="aspect-[460/215] overflow-hidden">
										<img 
											src={game.imageUrl} 
											alt={game.name}
											className="w-full h-full object-cover group-hover:scale-105 transition-transform"
										/>
									</div>
								)}
								<div className="p-3">
									<div className="font-semibold text-ink text-sm mb-1 line-clamp-2">
										{game.name}
									</div>
									<div className="flex items-center justify-between">
										<span className="text-xs text-muted">
											{game.achievementsTotal} achievements
										</span>
										<PlatformBadge platform={game.platform} showLabel={false} />
									</div>
									<div className="mt-2 flex items-center gap-1 text-xs text-ok-fg">
										<span>✓</span>
										<span>100%</span>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
			
			{/* Stats Summary */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-surface border border-line rounded-lg p-6">
					<div className="text-3xl mb-2">🎯</div>
					<div className="text-2xl font-bold text-ink mb-1">
						{games.filter(g => (g.achievementsTotal || 0) > 0).length}
					</div>
					<div className="text-sm text-muted">Games with Achievements</div>
				</div>
				
				<div className="bg-surface border border-line rounded-lg p-6">
					<div className="text-3xl mb-2">⚡</div>
					<div className="text-2xl font-bold text-ink mb-1">
						{games.filter(g => (g.achievementsEarned || 0) > 0).length}
					</div>
					<div className="text-sm text-muted">Games Started</div>
				</div>
				
				<div className="bg-surface border border-line rounded-lg p-6">
					<div className="text-3xl mb-2">💯</div>
					<div className="text-2xl font-bold text-ink mb-1">
						{perfectGames.length}
					</div>
					<div className="text-sm text-muted">Perfect Games</div>
				</div>
			</div>
		</div>
	);
};
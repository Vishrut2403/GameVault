import { Suspense, lazy, useState } from 'react';
import type { LibraryGame } from '../types/games.types';

const AnalyticsDashboardPage = lazy(() => import('./analytics/AnalyticsDashboardPage').then(m => ({ default: m.AnalyticsDashboardPage })));
const AnalyticsPlaytimePage = lazy(() => import('./analytics/AnalyticsPlaytimePage').then(m => ({ default: m.AnalyticsPlaytimePage })));
const AnalyticsAchievementsPage = lazy(() => import('./analytics/AnalyticsAchievementsPage').then(m => ({ default: m.AnalyticsAchievementsPage })));
const AnalyticsValuePage = lazy(() => import('./analytics/AnalyticsValuePage').then(m => ({ default: m.AnalyticsValuePage })));
const AnalyticsLibraryPage = lazy(() => import('./analytics/AnalyticsLibraryPage').then(m => ({ default: m.AnalyticsLibraryPage })));

interface AnalyticsProps {
	games: LibraryGame[];
}

type AnalyticsTab = 'dashboard' | 'playtime' | 'achievements' | 'value' | 'library';

export const Analytics: React.FC<AnalyticsProps> = ({ games }) => {
	const [activeTab, setActiveTab] = useState<AnalyticsTab>('dashboard');

	const tabs = [
		{ key: 'dashboard' as const, label: 'Dashboard', icon: '📊' },
		{ key: 'playtime' as const, label: 'Playtime', icon: '⏱️' },
		{ key: 'achievements' as const, label: 'Achievements', icon: '🏆' },
		{ key: 'value' as const, label: 'Value', icon: '💰' },
		{ key: 'library' as const, label: 'Library', icon: '📚' },
	];

	return (
		<Suspense fallback={<div className="py-12 text-[#a0a0a0]">Loading analytics…</div>}>
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-[#e5e5e5] mb-2">Analytics</h1>
				<p className="text-[#a0a0a0]">Deep insights into your gaming library</p>
			</div>

			{/* Sub-navigation */}
			<div className="flex gap-1 p-1.5 bg-[#1a1a1a] rounded-lg border border-[#333333] w-fit">
				{tabs.map(({ key, label, icon }) => (
					<button
						key={key}
						onClick={() => setActiveTab(key)}
						className={`group relative px-6 py-3 rounded font-semibold text-base transition-all duration-200 flex items-center gap-2 ${
							activeTab === key
								? 'bg-[#5a7fa3] text-[#e5e5e5] border border-[#7a9fc3]'
								: 'text-[#a0a0a0] hover:text-[#e5e5e5] hover:bg-[#333333]'
						}`}
					>
						<span>{icon}</span>
						<span>{label}</span>
						{activeTab === key && (
							<div className="absolute inset-0 rounded bg-[#5a7fa3]/10 pointer-events-none" />
						)}
					</button>
				))}
			</div>

			{/* Content */}
			<div>
				{activeTab === 'dashboard' && <AnalyticsDashboardPage games={games} />}
				{activeTab === 'playtime' && <AnalyticsPlaytimePage games={games} />}
				{activeTab === 'achievements' && <AnalyticsAchievementsPage games={games} />}
				{activeTab === 'value' && <AnalyticsValuePage games={games} />}
				{activeTab === 'library' && <AnalyticsLibraryPage games={games} />}
			</div>
		</div>
		</Suspense>
	);
};
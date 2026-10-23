import { Suspense, lazy, useState } from 'react';
import type { LibraryGame } from '../types/games.types';

const AnalyticsDashboardPage = lazy(() => import('./analytics/AnalyticsDashboardPage').then(m => ({ default: m.AnalyticsDashboardPage })));
const AnalyticsAchievementsPage = lazy(() => import('./analytics/AnalyticsAchievementsPage').then(m => ({ default: m.AnalyticsAchievementsPage })));
const AnalyticsValuePage = lazy(() => import('./analytics/AnalyticsValuePage').then(m => ({ default: m.AnalyticsValuePage })));

// A 14-point starburst for the brutal page header, as SVG polygon points.
const STARBURST = Array.from({ length: 28 }, (_, i) => {
	const angle = (Math.PI * 2 * i) / 28 - Math.PI / 2;
	const r = i % 2 === 0 ? 48 : 30;
	return `${(50 + r * Math.cos(angle)).toFixed(1)},${(50 + r * Math.sin(angle)).toFixed(1)}`;
}).join(' ');

interface AnalyticsProps {
	games: LibraryGame[];
}

type AnalyticsTab = 'dashboard' | 'achievements' | 'value';

export const Analytics: React.FC<AnalyticsProps> = ({ games }) => {
	const [activeTab, setActiveTab] = useState<AnalyticsTab>('dashboard');

	const tabs = [
		{ key: 'dashboard' as const, label: 'Dashboard', icon: '📊' },
		{ key: 'achievements' as const, label: 'Achievements', icon: '🏆' },
		{ key: 'value' as const, label: 'Value', icon: '💰' },
	];

	return (
		<Suspense fallback={<div className="py-12 text-muted">Loading analytics…</div>}>
		<div className="space-y-6">
			{/* Header */}
			<div className="nb-pagehead flex items-end justify-between gap-6">
				<div>
					<h1 className="text-3xl font-bold text-ink mb-2">Analytics</h1>
					<p className="text-muted">Deep insights into your gaming library</p>
				</div>
				<svg className="brutal-only shrink-0 mr-10 -rotate-8 max-md:hidden" width="150" height="150" viewBox="0 0 100 100" aria-hidden="true">
					<polygon points={STARBURST} fill="var(--nb-pink)" stroke="var(--line)" strokeWidth="2.5" strokeLinejoin="round" />
				</svg>
			</div>

			{/* Sub-navigation */}
			<div className="nb-tabbar flex flex-wrap gap-1 p-1.5 bg-surface rounded-lg border border-line w-fit">
				{tabs.map(({ key, label, icon }) => (
					<button
						key={key}
						onClick={() => setActiveTab(key)}
						aria-pressed={activeTab === key}
						className={`nb-tab nb-raise group relative px-6 py-3 rounded font-semibold text-base transition-all duration-200 flex items-center gap-2 ${
							activeTab === key
								? 'bg-accent text-ink border border-accent-hi-line'
								: 'text-muted hover:text-ink hover:bg-subtle'
						}`}
					>
						<span className="dark-only">{icon}</span>
						<span>{label}</span>
						{activeTab === key && (
							<div className="dark-only absolute inset-0 rounded bg-accent/10 pointer-events-none" />
						)}
					</button>
				))}
			</div>

			{/* Content */}
			<div>
				{activeTab === 'dashboard' && <AnalyticsDashboardPage games={games} />}
				{activeTab === 'achievements' && <AnalyticsAchievementsPage games={games} />}
				{activeTab === 'value' && <AnalyticsValuePage games={games} />}
			</div>
		</div>
		</Suspense>
	);
};
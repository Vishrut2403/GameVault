import { useCachedGet, BACKLOG_PLAN_URL } from '../services/cachedGet';

interface PlannedGame {
	gameId: string;
	name: string;
	imageUrl: string | null;
	remainingMinutes: number;
	finishDate: string; // YYYY-MM-DD
}

interface BacklogPlan {
	paceHours: number;
	playDaysPerWeek: number;
	plan: PlannedGame[];
	withoutHltb: { gameId: string; name: string }[];
}

const asLocalDate = (date: string) => new Date(`${date}T00:00`);
const monthKey = (date: string) => date.slice(0, 7);

function daysFromToday(date: string): number {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return Math.round((asLocalDate(date).getTime() - today.getTime()) / 86_400_000);
}

function whenLabel(date: string): string {
	const days = daysFromToday(date);
	if (days <= 0) return 'today';
	if (days === 1) return 'tomorrow';
	return `in ${days} days`;
}

/** Plan rows grouped by the month they finish in, in order. */
function byMonth(plan: PlannedGame[]): { key: string; games: PlannedGame[] }[] {
	const groups: { key: string; games: PlannedGame[] }[] = [];
	for (const game of plan) {
		const key = monthKey(game.finishDate);
		if (groups.at(-1)?.key !== key) groups.push({ key, games: [] });
		groups.at(-1)!.games.push(game);
	}
	return groups;
}

export default function BacklogPlanner({ onSelectGame }: { onSelectGame: (gameId: string) => void }) {
	const { data, error, loading } = useCachedGet<{ success: boolean; data: BacklogPlan }>(BACKLOG_PLAN_URL);
	const plan = data?.data;

	if (loading) {
		return (
			<div className="flex justify-center py-16">
				<div className="w-10 h-10 border-4 border-line border-t-accent-line rounded-full animate-spin" />
			</div>
		);
	}

	if (!plan) {
		return (
			<div className="p-4 bg-danger/10 border border-danger-line rounded-lg text-danger-fg">
				{error ? 'Failed to plan your backlog' : 'No plan available'}
			</div>
		);
	}

	const now = new Date();
	const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	const groups = byMonth(plan.plan);
	const doneThisMonth = groups[0]?.key === thisMonth ? groups[0].games.length : 0;
	const monthName = (key: string) =>
		key === thisMonth ? 'This month' : asLocalDate(`${key}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

	return (
		<div className="space-y-8">
			<div className="nb-pagehead">
				<h2 className="text-3xl font-bold text-ink mb-2">Backlog Planner</h2>
				<p className="text-muted">
					At your pace — {plan.paceHours}h on days you play, about {plan.playDaysPerWeek} days a week — playing your backlog shortest first.
				</p>
			</div>

			{plan.plan.length === 0 && plan.withoutHltb.length === 0 ? (
				<div className="p-8 text-center text-muted bg-surface border border-line rounded-lg">
					Mark games as Backlog and they'll be planned here.
				</div>
			) : (
				<>
					{plan.plan.length > 0 && (
						<p className="text-lg text-ink">
							<span className="font-bold">{doneThisMonth}</span> {doneThisMonth === 1 ? 'game' : 'games'} finished by the end of this month,
							{' '}<span className="font-bold">{plan.plan.length}</span> in all by{' '}
							<span className="font-bold">
								{asLocalDate(plan.plan.at(-1)!.finishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
							</span>.
						</p>
					)}

					{groups.map(({ key, games }, i) => (
						<section key={key} className={`nb-panel ${['nb-bar-lime', 'nb-bar-yellow', 'nb-bar-pink', 'nb-bar-cyan'][i % 4]} bg-surface border border-line rounded-lg p-6`}>
							<h3 className="nb-title text-xl font-bold text-ink mb-4">{monthName(key)}</h3>
							<ul className="space-y-3">
								{games.map((game) => (
									<li key={game.gameId}>
										<button
											onClick={() => onSelectGame(game.gameId)}
											className="w-full flex items-center gap-4 p-3 text-left bg-raised border border-line rounded-lg hover:border-accent-line transition-colors"
										>
											{game.imageUrl && (
												<img src={game.imageUrl} alt="" className="w-24 aspect-[460/215] object-cover rounded border border-line shrink-0" />
											)}
											<span className="flex-1 min-w-0">
												<span className="block font-semibold text-ink truncate">{game.name}</span>
												<span className="block text-sm text-muted">
													{game.remainingMinutes > 0
														? `~${Math.round(game.remainingMinutes / 6) / 10}h of main story left`
														: 'Past its main-story length'}
												</span>
											</span>
											<span className="text-right shrink-0">
												<span className="block font-semibold text-ink">
													{asLocalDate(game.finishDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
												</span>
												<span className="block text-sm text-muted">{whenLabel(game.finishDate)}</span>
											</span>
										</button>
									</li>
								))}
							</ul>
						</section>
					))}

					{plan.withoutHltb.length > 0 && (
						<p className="text-sm text-muted">
							Not planned, as HowLongToBeat has no time for {plan.withoutHltb.length === 1 ? 'it' : 'them'}:{' '}
							{plan.withoutHltb.map((g) => g.name).join(', ')}.
						</p>
					)}
				</>
			)}
		</div>
	);
}

import { useMemo } from 'react';
import { ScatterChart, Scatter, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import type { LibraryGame } from '../../types/games.types';

interface AnalyticsValuePageProps {
	games: LibraryGame[];
}

export const AnalyticsValuePage: React.FC<AnalyticsValuePageProps> = ({ games }) => {
	
	const paidGames = useMemo(() => {
		return games.filter(g => (g.pricePaid || 0) > 0);
	}, [games]);
	
	const scatterData = useMemo(() => {
		return paidGames
			.filter(g => (g.playtimeForever || 0) > 0)
			.map(g => ({
				name: g.name,
				hours: (g.playtimeForever || 0) / 60,
				price: g.pricePaid || 0,
				pricePerHour: (g.pricePaid || 0) / ((g.playtimeForever || 0) / 60)
			}));
	}, [paidGames]);
	
	const bestValue = useMemo(() => {
		return [...paidGames]
			.filter(g => (g.playtimeForever || 0) >= 60) 
			.map(g => ({
				name: g.name.length > 30 ? g.name.substring(0, 30) + '...' : g.name,
				pricePerHour: (g.pricePaid || 0) / ((g.playtimeForever || 0) / 60),
				hours: (g.playtimeForever || 0) / 60,
				price: g.pricePaid || 0
			}))
			.sort((a, b) => a.pricePerHour - b.pricePerHour)
			.slice(0, 10);
	}, [paidGames]);
	
	const mostExpensive = useMemo(() => {
		return [...paidGames]
			.sort((a, b) => (b.pricePaid || 0) - (a.pricePaid || 0))
			.slice(0, 10)
			.map(g => ({
				name: g.name.length > 30 ? g.name.substring(0, 30) + '...' : g.name,
				price: g.pricePaid || 0
			}));
	}, [paidGames]);
	
	const pricePerHour = useMemo(() => {
		return [...paidGames]
			.filter(g => (g.playtimeForever || 0) >= 60) 
			.map(g => ({
				name: g.name.length > 30 ? g.name.substring(0, 30) + '...' : g.name,
				pricePerHour: (g.pricePaid || 0) / ((g.playtimeForever || 0) / 60)
			}))
			.sort((a, b) => a.pricePerHour - b.pricePerHour)
			.slice(0, 10);
	}, [paidGames]);
	
	const stats = useMemo(() => {
		const totalSpent = paidGames.reduce((sum, g) => sum + (g.pricePaid || 0), 0);
		const totalHours = paidGames.reduce((sum, g) => sum + (g.playtimeForever || 0), 0) / 60;
		const avgPrice = totalSpent / paidGames.length;
		const avgPricePerHour = totalHours > 0 ? totalSpent / totalHours : 0;
		
		return {
			totalSpent,
			totalHours,
			avgPrice,
			avgPricePerHour
		};
	}, [paidGames]);
	
	const formatCurrency = (amount: number) => {
		return `₹${amount.toFixed(2)}`;
	};

	return (
		<div className="space-y-8">
			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				<div className="bg-surface border border-line rounded-lg p-6">
					<div className="text-muted text-sm mb-2">Total Spent</div>
					<div className="text-3xl font-bold text-ink">{formatCurrency(stats.totalSpent)}</div>
					<div className="text-xs text-faint mt-1">
						{paidGames.length} games purchased
					</div>
				</div>
				
				<div className="bg-surface border border-line rounded-lg p-6">
					<div className="text-muted text-sm mb-2">Average Game Price</div>
					<div className="text-3xl font-bold text-ink">{formatCurrency(stats.avgPrice)}</div>
					<div className="text-xs text-faint mt-1">
						Per game
					</div>
				</div>
				
				<div className="bg-surface border border-line rounded-lg p-6">
					<div className="text-muted text-sm mb-2">Total Hours</div>
					<div className="text-3xl font-bold text-ink">{Math.round(stats.totalHours)}h</div>
					<div className="text-xs text-faint mt-1">
						On paid games
					</div>
				</div>
				
				<div className="bg-surface border border-line rounded-lg p-6">
					<div className="text-muted text-sm mb-2">Avg Price/Hour</div>
					<div className="text-3xl font-bold text-ink">{formatCurrency(stats.avgPricePerHour)}</div>
					<div className="text-xs text-faint mt-1">
						Cost per hour
					</div>
				</div>
			</div>
			
			{/* Price vs Playtime Scatter Plot */}
			<div className="bg-surface border border-line rounded-lg p-6">
				<h3 className="text-xl font-bold text-ink mb-2">Price vs Playtime</h3>
				<p className="text-sm text-muted mb-6">
					Bottom-right = best value (high hours, low price) • Top-left = worst value
				</p>
				<ResponsiveContainer width="100%" height={400}>
					<ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
						<XAxis 
							type="number" 
							dataKey="hours" 
							name="Hours" 
							stroke="var(--chart-axis)"
							label={{ value: 'Hours Played', position: 'insideBottom', offset: -10, fill: 'var(--chart-axis)' }}
						/>
						<YAxis 
							type="number" 
							dataKey="price" 
							name="Price" 
							stroke="var(--chart-axis)"
							label={{ value: 'Price (₹)', angle: -90, position: 'insideLeft', fill: 'var(--chart-axis)' }}
						/>
						<ZAxis type="number" dataKey="pricePerHour" range={[50, 400]} />
						<Tooltip 
							contentStyle={{ backgroundColor: 'var(--tip-bg)', border: '1px solid var(--tip-line)', borderRadius: '8px' }}
							labelStyle={{ color: 'var(--tip-fg)' }}
							content={({ active, payload }) => {
								if (active && payload && payload.length) {
									const data = payload[0].payload;
									return (
										<div className="bg-surface border border-line rounded-lg p-3">
											<div className="font-semibold text-ink mb-2">{data.name}</div>
											<div className="text-sm text-muted space-y-1">
												<div>Hours: {data.hours.toFixed(1)}h</div>
												<div>Price: {formatCurrency(data.price)}</div>
												<div>₹/hour: {formatCurrency(data.pricePerHour)}</div>
											</div>
										</div>
									);
								}
								return null;
							}}
						/>
						<Scatter data={scatterData} fill="#3b82f6" />
					</ScatterChart>
				</ResponsiveContainer>
			</div>
			
			{/* Best Value Games */}
			<div className="bg-surface border border-line rounded-lg p-6">
				<h3 className="text-xl font-bold text-ink mb-6">Best Value Games (Lowest $/Hour)</h3>
				<div className="space-y-4">
					{bestValue.map((game, idx) => (
						<div 
							key={idx} 
							className="flex items-center justify-between p-4 bg-raised rounded-lg border border-line hover:border-ok-line transition-all"
						>
							<div className="flex items-center gap-4">
								<div className="w-8 h-8 rounded-full bg-ok-hi/20 border border-ok-line flex items-center justify-center font-bold text-ok-fg">
									{idx + 1}
								</div>
								<div>
									<div className="font-semibold text-ink">{game.name}</div>
									<div className="text-sm text-muted">
										{game.hours.toFixed(1)}h played • {formatCurrency(game.price)} paid
									</div>
								</div>
							</div>
							<div className="text-right">
								<div className="text-2xl font-bold text-ok-fg">
									{formatCurrency(game.pricePerHour)}
								</div>
								<div className="text-xs text-faint">per hour</div>
							</div>
						</div>
					))}
				</div>
			</div>
			
			{/* Most Expensive + Price Per Hour */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-surface border border-line rounded-lg p-6">
					<h3 className="text-xl font-bold text-ink mb-6">Most Expensive Games</h3>
					<ResponsiveContainer width="100%" height={400}>
						<BarChart data={mostExpensive} layout="vertical">
							<CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
							<XAxis type="number" stroke="var(--chart-axis)" />
							<YAxis dataKey="name" type="category" stroke="var(--chart-axis)" width={150} />
							<Tooltip 
								contentStyle={{ backgroundColor: 'var(--tip-bg)', border: '1px solid var(--tip-line)', borderRadius: '8px' }}
								labelStyle={{ color: 'var(--tip-fg)' }}
								formatter={(value) => [formatCurrency(Number(value)), 'Price']}
							/>
							<Bar dataKey="price" fill="#ec4899" />
						</BarChart>
					</ResponsiveContainer>
				</div>
				
				<div className="bg-surface border border-line rounded-lg p-6">
					<h3 className="text-xl font-bold text-ink mb-6">Price per Hour Ranking</h3>
					<ResponsiveContainer width="100%" height={400}>
						<BarChart data={pricePerHour} layout="vertical">
							<CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
							<XAxis type="number" stroke="var(--chart-axis)" />
							<YAxis dataKey="name" type="category" stroke="var(--chart-axis)" width={150} />
							<Tooltip 
								contentStyle={{ backgroundColor: 'var(--tip-bg)', border: '1px solid var(--tip-line)', borderRadius: '8px' }}
								labelStyle={{ color: 'var(--tip-fg)' }}
								formatter={(value) => [formatCurrency(Number(value)) + '/hour', 'Cost']}
							/>
							<Bar dataKey="pricePerHour" fill="#10b981" />
						</BarChart>
					</ResponsiveContainer>
				</div>
			</div>
		</div>
	);
};
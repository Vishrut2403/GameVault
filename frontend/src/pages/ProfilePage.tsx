import { API_BASE_URL as API_URL } from '../services/api';
import type { User } from '../types/user.types';

interface ProfilePageProps {
	user: User;
	onUpdate: () => void;
}

export default function ProfilePage({ user, onUpdate }: ProfilePageProps) {
	const handleConnectSteam = () => {
		const token = localStorage.getItem('token');
		if (!token) {
			alert('Please log in again.');
			return;
		}
		fetch(`${API_URL}/api/auth/steam/start`, {
			method: 'GET',
			headers: { 'Authorization': `Bearer ${token}` }
		})
			.then(async (response) => {
				if (!response.ok) throw new Error('Failed to start Steam auth');
				const data = await response.json();
				if (!data?.url) throw new Error('Missing Steam auth URL');
				window.location.href = data.url;
			})
			.catch(() => alert('Failed to start Steam connection'));
	};

	const handleDisconnectSteam = async () => {
		if (!confirm('Disconnect Steam account? This will not delete your games.')) return;
		try {
			const token = localStorage.getItem('token');
			const response = await fetch(`${API_URL}/api/user/disconnect-steam`, {
				method: 'POST',
				headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
			});
			if (response.ok) { alert('Steam disconnected!'); onUpdate(); }
		} catch { alert('Failed to disconnect Steam'); }
	};

	return (
		<div className="max-w-4xl mx-auto">
			{/* User Info Card */}
			<div className="nb-fill-violet bg-surface border border-line rounded-lg p-8 mb-8">
				<div className="flex items-center gap-6">
					<div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center text-4xl font-bold text-ink">
						{user.username.charAt(0).toUpperCase()}
					</div>
					<div className="flex-1">
						<h2 className="text-3xl font-bold text-ink mb-1">{user.displayName || user.username}</h2>
						<p className="text-muted mb-2">@{user.username}</p>
						<div className="mt-4">
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-semibold text-ink">Level {user.level}</span>
								<span className="text-sm text-faint">{user.xp} XP</span>
							</div>
							<div className="w-full h-3 bg-raised rounded-full overflow-hidden">
								<div
									className="h-full bg-accent rounded-full transition-all duration-500"
									style={{ width: `${(user.xp % 1000) / 10}%` }}
								/>
							</div>
							<p className="text-xs text-faint mt-1">{1000 - (user.xp % 1000)} XP to Level {user.level + 1}</p>
						</div>
					</div>
				</div>
			</div>

			{/* Platform Connections */}
			<div className="nb-panel nb-bar-cyan bg-surface border border-line rounded-lg p-8">
				<h3 className="nb-title text-2xl font-bold text-ink mb-2">Account Links</h3>
				<p className="text-muted mb-6">
					Connect your Steam account to automatically sync your library and track progress.
				</p>

				<div className="grid grid-cols-1 gap-6">
					{/* Steam */}
					<div className="bg-raised border border-line rounded-lg p-6">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-3">
								<div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
									<svg className="w-8 h-8 text-ink" viewBox="0 0 24 24" fill="currentColor">
										<path d="M12 2a10 10 0 0 0-10 10 10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2M6.5 14.8l1.4.6c.2-.4.6-.8 1.1-.9l2.1-3c0-1.3 1.1-2.4 2.4-2.4 1.3 0 2.4 1.1 2.4 2.4 0 1.3-1.1 2.4-2.4 2.4h-.1l-2.9 2.1c-.2.9-1 1.6-2 1.6-.8 0-1.5-.5-1.8-1.2l-1.4-.6c.3 2.3 2.2 4 4.5 4 2.5 0 4.5-2 4.5-4.5S14.5 11 12 11c-.3 0-.6 0-.8.1l.7 1.6h.1c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5c-.7 0-1.3-.5-1.5-1.2l-1.6-.7c-.4.5-.9.8-1.5.8-.6 0-1.1-.3-1.4-.7z"/>
									</svg>
								</div>
								<div>
									<h4 className="font-semibold text-ink">Steam</h4>
									<p className="text-sm text-muted">{user.steamUsername || '-'}</p>
								</div>
							</div>
						</div>

						{user.steamId ? (
							<>
								<div className="flex items-center gap-2 mb-3">
									<svg className="w-5 h-5 text-ok-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
									</svg>
									<span className="text-sm text-ok-fg font-medium">Linked</span>
								</div>
								<p className="text-xs text-faint mb-4">
									Last updated: {user.steamLinkedAt ? new Date(user.steamLinkedAt).toLocaleDateString() : 'Never'}
								</p>
								<button type="button" onClick={handleDisconnectSteam}
									className="w-full px-4 py-2 bg-danger border border-danger-line text-danger-fg rounded-lg hover:bg-danger-hi transition-all text-sm font-medium">
									Disconnect
								</button>
							</>
						) : (
							<>
								<div className="flex items-center gap-2 mb-3">
									<svg className="w-5 h-5 text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
									<span className="text-sm text-faint font-medium">Not linked</span>
								</div>
								<p className="text-xs text-faint mb-4">Connect to sync your Steam library automatically</p>
								<button type="button" onClick={handleConnectSteam}
									className="w-full px-4 py-2 bg-accent hover:bg-accent-hi text-ink rounded-lg transition-all text-sm font-medium">
									Connect Steam
								</button>
							</>
						)}
					</div>

				</div>
			</div>
		</div>
	);
}
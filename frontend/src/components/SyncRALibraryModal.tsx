import React, { useState } from 'react';
import { retroAchievementsService } from '../services/retroachievements.service';

interface SyncRALibraryModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSync: () => void;
	userId: string;
}

const SyncRALibraryModal: React.FC<SyncRALibraryModalProps> = ({
	isOpen,
	onClose,
	onSync,
	userId
}) => {
	const [username, setUsername] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [syncResult, setSyncResult] = useState<any>(null);

	const handleSync = async () => {
		if (!username.trim()) {
			setError('Please enter your RetroAchievements username');
			return;
		}

		setIsLoading(true);
		setError('');
		setSyncResult(null);

		try {
			console.log('Starting RA sync for username:', username);
			const result = await retroAchievementsService.syncLibrary(userId, username.trim());
			
			console.log('Sync complete:', result);
			setSyncResult(result.summary);
			
			if (result.summary.added > 0 || result.summary.updated > 0) {
				setTimeout(() => {
					onSync();
					onClose();
				}, 2000);
			} else {
				setTimeout(() => {
					onClose();
				}, 3000);
			}
			
		} catch (err: any) {
			console.error('Sync failed:', err);
			setError(err.response?.data?.error || 'Failed to sync library. Check your username and API key.');
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = () => {
		setUsername('');
		setError('');
		setSyncResult(null);
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div 
			className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
			onClick={handleClose}
		>
			<div 
				className="bg-[#000000] rounded-lg p-6 max-w-md w-full mx-4 border border-[#333333]"
				onClick={(e) => e.stopPropagation()}
			>
				<h2 className="text-2xl font-bold mb-4 text-[#e5e5e5]">
					Sync RetroAchievements Library
				</h2>

				{!syncResult ? (
					<>
						<div className="mb-4">
							<label className="block text-[#a0a0a0] mb-2">
								RetroAchievements Username
							</label>
							<input
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								placeholder="Enter your RA username"
								className="w-full px-3 py-2 bg-[#1a1a1a] text-[#e5e5e5] rounded border border-[#333333] focus:border-[#5a7fa3] focus:outline-none"
								disabled={isLoading}
							/>
							<p className="text-sm text-[#696969] mt-2">
								Make sure your API key is set in backend .env file
							</p>
						</div>

						{error && (
							<div className="mb-4 p-3 bg-[#4a3a3a] border border-[#5a4a4a] rounded text-[#a0a0a0]">
								{error}
							</div>
						)}

						<div className="flex gap-3">
							<button
								onClick={handleSync}
								disabled={isLoading}
								className={`flex-1 py-2 px-4 rounded font-semibold ${
									isLoading
										? 'bg-[#333333] cursor-not-allowed text-[#696969]'
										: 'bg-[#5a7fa3] hover:bg-[#7a9fc3] text-[#e5e5e5]'
								} transition-colors`}
							>
								{isLoading ? (
									<span className="flex items-center justify-center gap-2">
										<svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
												fill="none"
											/>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											/>
										</svg>
										Syncing...
									</span>
								) : (
									'Sync Library'
								)}
							</button>
							<button
								onClick={handleClose}
								disabled={isLoading}
								className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#333333] text-[#a0a0a0] rounded font-semibold transition-colors disabled:opacity-50 border border-[#333333]"
							>
								Cancel
							</button>
						</div>
					</>
				) : (
					<>
						<div className="mb-4 p-4 bg-[#3a4a3a] border border-[#5a7fa3] rounded">
							<h3 className="text-[#7a9fc3] font-semibold mb-2">
								Sync Successful!
							</h3>
							<div className="text-sm text-[#a0a0a0] space-y-1">
								<p>Total Games Found: {syncResult.totalGames || 0}</p>
								<p>Added: {syncResult.added || 0}</p>
								<p>Updated: {syncResult.updated || 0}</p>
								<p>Skipped: {syncResult.skipped || 0}</p>
								<p className="mt-2 pt-2 border-t border-[#5a5a5a]">
									Total Points: {syncResult.totalPoints?.toLocaleString() || 0}
								</p>
								<p>Weighted Points: {syncResult.totalTruePoints?.toLocaleString() || 0}</p>
							</div>
						</div>
						<p className="text-center text-[#696969] text-sm">
							Refreshing library...
						</p>
					</>
				)}
			</div>
		</div>
	);
};

export default SyncRALibraryModal;
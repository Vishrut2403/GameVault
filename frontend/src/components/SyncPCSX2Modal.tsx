import { useState } from 'react';

interface SyncPCSX2ModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSync: () => void;
	userId: string;
}

const SyncPCSX2Modal: React.FC<SyncPCSX2ModalProps> = ({ isOpen, onClose, onSync, userId }) => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [syncResult, setSyncResult] = useState<{
		total: number;
		updated: number;
		notFound: number;
	} | null>(null);

	if (!isOpen) return null;

	const handleSync = async () => {
		setIsLoading(true);
		setError('');
		setSyncResult(null);

		try {
			
			const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
			const response = await fetch(`${API_URL}/api/pcsx2/sync`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId })
			});
			
			const data = await response.json();
			
			setSyncResult(data.summary);

			setTimeout(() => {
				onSync();
				onClose();
			}, 2000);
			
		} catch (err: any) {
			console.error('PCSX2 sync failed:', err);
			setError(err.response?.data?.error || 'Failed to sync PCSX2 playtimes. Make sure PCSX2 is installed.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div 
			className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70"
			onClick={onClose}
		>
			<div 
				className="bg-[#000000] border border-[#333333] rounded-lg p-6 max-w-md w-full shadow-lg"
				onClick={(e) => e.stopPropagation()}
			>
				<h2 className="text-2xl font-bold text-[#e5e5e5] mb-4">Sync PCSX2 Playtime</h2>
				
				{!syncResult && !isLoading && (
					<>
						<p className="text-[#a0a0a0] mb-6">
							This will read playtime data from PCSX2 and update your RetroAchievements games.
						</p>
						
						{error && (
							<div className="mb-4 p-3 bg-[#4a3a3a] border border-[#5a4a4a] rounded text-[#a0a0a0] text-sm">
								{error}
							</div>
						)}

						<div className="flex gap-3">
							<button
								onClick={handleSync}
								disabled={isLoading}
								className="flex-1 px-6 py-3 bg-[#5a7fa3] border border-[#5a7fa3] text-[#e5e5e5] rounded font-semibold hover:bg-[#7a9fc3] transition-all duration-200 disabled:opacity-50"
							>
								{isLoading ? 'Syncing...' : 'Sync Playtime'}
							</button>
							<button
								onClick={onClose}
								className="px-6 py-3 bg-[#1a1a1a] border border-[#333333] text-[#a0a0a0] rounded font-semibold hover:bg-[#333333] transition-all duration-200"
							>
								Cancel
							</button>
						</div>
					</>
				)}

				{isLoading && (
					<div className="text-center py-8">
						<div className="inline-block w-12 h-12 border-4 border-[#5a7fa3] border-t-transparent rounded-full animate-spin mb-4" />
						<p className="text-[#a0a0a0]">Reading PCSX2 playtime data...</p>
					</div>
				)}

				{syncResult && (
					<div className="space-y-4">
						<div className="p-4 bg-[#3a4a3a] border border-[#5a7fa3] rounded">
							<h3 className="text-[#7a9fc3] font-semibold mb-2">Sync Successful!</h3>
							<div className="text-sm text-[#a0a0a0] space-y-1">
								<p>Total Games: {syncResult.total}</p>
								<p>Updated: {syncResult.updated}</p>
								<p>Not Found: {syncResult.notFound}</p>
							</div>
						</div>
						<p className="text-center text-[#696969] text-sm">
							Refreshing library...
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default SyncPCSX2Modal;
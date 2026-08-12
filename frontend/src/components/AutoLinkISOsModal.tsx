import { useState } from 'react';
import axios from 'axios';

interface AutoLinkISOsModalProps {
	isOpen: boolean;
	onClose: () => void;
	onLink: () => void;
}

const AutoLinkISOsModal: React.FC<AutoLinkISOsModalProps> = ({ isOpen, onClose, onLink }) => {
	const token = localStorage.getItem('token');
	const [isoDirectory, setIsoDirectory] = useState('/myspace/Emulator ISOs/PS2');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [linkResult, setLinkResult] = useState<{
		totalGames: number;
		totalISOs: number;
		linked: number;
		notMatched: number;
	} | null>(null);

	if (!isOpen) return null;

	const handleAutoLink = async () => {
		if (!isoDirectory.trim()) {
			setError('Please enter your ISO directory path');
			return;
		}

		setIsLoading(true);
		setError('');
		setLinkResult(null);

		try {
			const response = await axios.post('http://localhost:3001/api/pcsx2/auto-link', {
				isoDirectory: isoDirectory.trim()
			}, {
				headers: token ? { Authorization: `Bearer ${token}` } : undefined
			});
			setLinkResult(response.data.summary);
			
			setTimeout(() => {
				onLink();
				onClose();
			}, 3000);
			
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to auto-link ISOs. Check the directory path.');
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
				<h2 className="text-2xl font-bold text-[#e5e5e5] mb-4">Auto-Link PS2 ISOs</h2>
				
				{!linkResult && !isLoading && (
					<>
						<p className="text-[#a0a0a0] mb-4">
							Scan your PS2 ISO directory and automatically link games to your RetroAchievements library.
						</p>
						
						<div className="mb-4">
							<label className="block text-sm font-semibold text-[#a0a0a0] mb-2">
								ISO Directory Path
							</label>
							<input
								type="text"
								value={isoDirectory}
								onChange={(e) => setIsoDirectory(e.target.value)}
								className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333333] rounded text-[#e5e5e5] placeholder-[#696969] focus:border-[#5a7fa3] focus:outline-none"
								placeholder="/path/to/PS2/ISOs"
							/>
							<p className="text-xs text-[#696969] mt-2">
								Default: /myspace/Emulator ISOs/PS2
							</p>
						</div>
						
						{error && (
							<div className="mb-4 p-3 bg-[#4a3a3a] border border-[#5a4a4a] rounded text-[#a0a0a0] text-sm">
								{error}
							</div>
						)}

						<div className="flex gap-3">
							<button
								onClick={handleAutoLink}
								disabled={isLoading}
								className="flex-1 px-6 py-3 bg-[#5a7fa3] border border-[#5a7fa3] text-[#e5e5e5] rounded font-semibold hover:bg-[#7a9fc3] transition-all duration-200 disabled:opacity-50"
							>
								{isLoading ? 'Scanning...' : 'Auto-Link ISOs'}
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
						<p className="text-[#a0a0a0]">Scanning ISOs...</p>
					</div>
				)}

				{linkResult && (
					<div className="space-y-4">
						<div className="p-4 bg-[#3a4a3a] border border-[#5a7fa3] rounded">
							<h3 className="text-[#7a9fc3] font-semibold mb-2">Scan Complete!</h3>
							<div className="text-sm text-[#a0a0a0] space-y-1">
								<p>Total Games: {linkResult.totalGames}</p>
								<p>Total ISOs Found: {linkResult.totalISOs}</p>
								<p>Linked: {linkResult.linked}</p>
								<p>Not Matched: {linkResult.notMatched}</p>
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

export default AutoLinkISOsModal;
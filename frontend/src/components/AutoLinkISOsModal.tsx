import { useState } from 'react';
import axios from 'axios';

interface AutoLinkISOsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: () => void;
  userId: string;
}

const AutoLinkISOsModal: React.FC<AutoLinkISOsModalProps> = ({ isOpen, onClose, onLink, userId }) => {
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
      console.log('🔗 Starting auto-link...');
      
      const response = await axios.post('http://localhost:3001/api/pcsx2/auto-link', {
        userId,
        isoDirectory: isoDirectory.trim()
      });
      
      console.log('✅ Auto-link complete:', response.data);
      setLinkResult(response.data.summary);
      
      // Auto-close after showing results
      setTimeout(() => {
        onLink();
        onClose();
      }, 3000);
      
    } catch (err: any) {
      console.error('❌ Auto-link failed:', err);
      setError(err.response?.data?.error || 'Failed to auto-link ISOs. Check the directory path.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900/95 border border-slate-700/50 rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-4">Auto-Link PS2 ISOs</h2>
        
        {!linkResult && !isLoading && (
          <>
            <p className="text-gray-300 mb-4">
              Scan your PS2 ISO directory and automatically link games to your RetroAchievements library.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                ISO Directory Path
              </label>
              <input
                type="text"
                value={isoDirectory}
                onChange={(e) => setIsoDirectory(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none"
                placeholder="/path/to/PS2/ISOs"
              />
              <p className="text-xs text-gray-500 mt-2">
                Default: /myspace/Emulator ISOs/PS2
              </p>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAutoLink}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-xl font-semibold hover:bg-blue-600/30 transition-all duration-300 disabled:opacity-50"
              >
                {isLoading ? 'Scanning...' : 'Auto-Link ISOs'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-slate-700/50 border border-slate-600/50 text-white rounded-xl font-semibold hover:bg-slate-600/50 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-300">Scanning ISOs and matching games...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a minute</p>
          </div>
        )}

        {linkResult && (
          <div className="mb-4 p-4 bg-green-900/50 border border-green-500/30 rounded-lg">
            <h3 className="text-green-200 font-semibold mb-2">✅ Auto-Link Complete!</h3>
            <div className="text-sm text-gray-300 space-y-1">
              <p>RA Games: {linkResult.totalGames}</p>
              <p>ISOs Found: {linkResult.totalISOs}</p>
              <p className="text-green-300 font-semibold">Linked: {linkResult.linked}</p>
              <p>Not Matched: {linkResult.notMatched}</p>
            </div>
            {linkResult.linked > 0 && (
              <p className="text-xs text-gray-400 mt-3">
                Now sync PCSX2 playtime to see your play hours!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoLinkISOsModal;
import { useState } from 'react';
import axios from 'axios';

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
      console.log('🕹️ Starting PCSX2 playtime sync...');
      
      const response = await axios.post('http://localhost:3001/api/pcsx2/sync', { userId });
      
      console.log('✅ PCSX2 sync complete:', response.data);
      setSyncResult(response.data.summary);
      
      // Auto-close after showing results
      setTimeout(() => {
        onSync();
        onClose();
      }, 2000);
      
    } catch (err: any) {
      console.error('❌ PCSX2 sync failed:', err);
      setError(err.response?.data?.error || 'Failed to sync PCSX2 playtimes. Make sure PCSX2 is installed.');
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
        <h2 className="text-2xl font-bold text-white mb-4">Sync PCSX2 Playtime</h2>
        
        {!syncResult && !isLoading && (
          <>
            <p className="text-gray-300 mb-6">
              This will read playtime data from PCSX2 and update your RetroAchievements games.
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSync}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-purple-600/20 border border-purple-500/30 text-purple-300 rounded-xl font-semibold hover:bg-purple-600/30 transition-all duration-300 disabled:opacity-50"
              >
                {isLoading ? 'Syncing...' : 'Sync Playtime'}
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
            <div className="inline-block w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-300">Reading PCSX2 playtime data...</p>
          </div>
        )}

        {syncResult && (
          <div className="mb-4 p-4 bg-green-900/50 border border-green-500/30 rounded-lg">
            <h3 className="text-green-200 font-semibold mb-2">✅ Sync Successful!</h3>
            <div className="text-sm text-gray-300 space-y-1">
              <p>Total Games Found: {syncResult.total}</p>
              <p>Updated: {syncResult.updated}</p>
              <p>Not Matched: {syncResult.notFound}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncPCSX2Modal;
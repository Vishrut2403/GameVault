import { useState } from 'react';
import axios from 'axios';

interface SyncRPCS3ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: () => void;
  userId: string;
}

const SyncRPCS3Modal: React.FC<SyncRPCS3ModalProps> = ({ isOpen, onClose, onSync, userId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [syncResult, setSyncResult] = useState<{
    playtime: { total: number; updated: number; notFound: number };
    trophies: { total: number; updated: number; notFound: number };
  } | null>(null);

  if (!isOpen) return null;

  const handleSync = async () => {
    setIsLoading(true);
    setError('');
    setSyncResult(null);

    try {
      console.log('🎮 Starting RPCS3 sync (playtime + trophies)...');
      
      // Sync playtime first
      const playtimeResponse = await axios.post('http://localhost:3001/api/rpcs3/sync', { userId });
      console.log('✅ Playtime synced:', playtimeResponse.data);
      
      // Sync trophies
      const trophyResponse = await axios.post('http://localhost:3001/api/rpcs3/sync-trophies', { userId });
      console.log('✅ Trophies synced:', trophyResponse.data);
      
      setSyncResult({
        playtime: playtimeResponse.data.summary,
        trophies: trophyResponse.data.summary
      });
      
      // Auto-close after showing results
      setTimeout(() => {
        onSync();
        onClose();
      }, 3000);
      
    } catch (err: any) {
      console.error('❌ RPCS3 sync failed:', err);
      setError(err.response?.data?.error || 'Failed to sync RPCS3 data. Make sure RPCS3 is installed.');
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
        <h2 className="text-2xl font-bold text-white mb-4">Sync RPCS3 Data</h2>
        
        {!syncResult && !isLoading && (
          <>
            <p className="text-gray-300 mb-6">
              This will sync playtime and trophy data from RPCS3 to your PS3 games.
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
                className="flex-1 px-6 py-3 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-xl font-semibold hover:bg-blue-600/30 transition-all duration-300 disabled:opacity-50"
              >
                {isLoading ? 'Syncing...' : 'Sync Playtime & Trophies'}
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
            <p className="text-gray-300">Syncing RPCS3 data...</p>
            <p className="text-sm text-gray-500 mt-2">Reading playtime and trophy files</p>
          </div>
        )}

        {syncResult && (
          <div className="space-y-4">
            {/* Playtime Results */}
            <div className="p-4 bg-green-900/50 border border-green-500/30 rounded-lg">
              <h3 className="text-green-200 font-semibold mb-2">🕹️ Playtime</h3>
              <div className="text-sm text-gray-300 space-y-1">
                <p>Games Found: {syncResult.playtime.total}</p>
                <p>Updated: {syncResult.playtime.updated}</p>
                <p>Not Matched: {syncResult.playtime.notFound}</p>
              </div>
            </div>

            {/* Trophy Results */}
            <div className="p-4 bg-purple-900/50 border border-purple-500/30 rounded-lg">
              <h3 className="text-purple-200 font-semibold mb-2">🏆 Trophies</h3>
              <div className="text-sm text-gray-300 space-y-1">
                <p>Trophy Sets Found: {syncResult.trophies.total}</p>
                <p>Updated: {syncResult.trophies.updated}</p>
                <p>Not Matched: {syncResult.trophies.notFound}</p>
              </div>
            </div>

            {(syncResult.playtime.updated > 0 || syncResult.trophies.updated > 0) && (
              <p className="text-xs text-gray-400 text-center">
                Refreshing your library...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncRPCS3Modal;
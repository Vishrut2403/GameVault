import { useState } from 'react';
import axios from 'axios';

interface LinkPPSSPPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: () => void;
  userId: string;
}

const LinkPPSSPPModal: React.FC<LinkPPSSPPModalProps> = ({ isOpen, onClose, onLink, userId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkResult, setLinkResult] = useState<{
    total: number;
    linked: number;
    notFound: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleLink = async () => {
    setIsLoading(true);
    setError('');
    setLinkResult(null);

    try {
      console.log('Starting PPSSPP serial linking...');
      
      const response = await axios.post('http://localhost:3001/api/ppsspp/link-serials', { userId });
      
      console.log('Linking complete:', response.data);
      setLinkResult(response.data.summary);
      
      setTimeout(() => {
        onLink();
        onClose();
      }, 2000);
      
    } catch (err: any) {
      console.error('PPSSPP linking failed:', err);
      setError(err.response?.data?.error || 'Failed to link PPSSPP serials. Make sure PPSSPP is installed.');
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
        <h2 className="text-2xl font-bold text-white mb-4">Sync PPSSPP Playtime</h2>
        
        {!linkResult && !isLoading && (
          <>
            <p className="text-gray-300 mb-6">
              This will scan PPSSPP config and sync playtime for your PSP games.
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleLink}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-green-600/20 border border-green-500/30 text-green-300 rounded-xl font-semibold hover:bg-green-600/30 transition-all duration-300 disabled:opacity-50"
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
            <div className="inline-block w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-300">Syncing PPSSPP playtime...</p>
          </div>
        )}

        {linkResult && (
          <div className="mb-4 p-4 bg-green-900/50 border border-green-500/30 rounded-lg">
            <h3 className="text-green-200 font-semibold mb-2">✅ Sync Complete!</h3>
            <div className="text-sm text-gray-300 space-y-1">
              <p>PSP Games Found: {linkResult.total}</p>
              <p>Synced: {linkResult.linked}</p>
              <p>Not Matched: {linkResult.notFound}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkPPSSPPModal;
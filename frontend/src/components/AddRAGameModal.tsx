import React, { useState } from 'react';
import { retroAchievementsService } from '../services/retroachievements.service';

interface AddRAGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
  userId: string;
}

const AddRAGameModal: React.FC<AddRAGameModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  userId
}) => {
  const [gameId, setGameId] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!gameId.trim()) {
      setError('Please enter a game ID');
      return;
    }

    const gameIdNum = parseInt(gameId);
    if (isNaN(gameIdNum)) {
      setError('Game ID must be a number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('➕ Adding RA game:', gameIdNum);
      await retroAchievementsService.addGame(userId, gameIdNum, username.trim() || undefined);
      
      console.log('✅ Game added successfully');
      
      // Refresh library and close
      onAdd();
      handleClose();
      
    } catch (err: any) {
      console.error('❌ Failed to add game:', err);
      setError(err.response?.data?.error || 'Failed to add game. Check the game ID.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setGameId('');
    setUsername('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div 
        className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 text-white">
          Add RetroAchievements Game
        </h2>

        <div className="mb-4">
          <label className="block text-gray-300 mb-2">
            Game ID <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            placeholder="e.g., 11240 for God of War"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            disabled={isLoading}
          />
          <p className="text-sm text-gray-400 mt-1">
            Find game IDs at{' '}
            <a
              href="https://retroachievements.org/gameList.php"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              retroachievements.org
            </a>
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 mb-2">
            Your RA Username (optional)
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="To sync your progress"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            disabled={isLoading}
          />
          <p className="text-sm text-gray-400 mt-1">
            Leave blank to add game with 0% completion
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-500 rounded text-red-200">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleAdd}
            disabled={isLoading}
            className={`flex-1 py-2 px-4 rounded font-semibold ${
              isLoading
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white transition-colors`}
          >
            {isLoading ? 'Adding...' : 'Add Game'}
          </button>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddRAGameModal;
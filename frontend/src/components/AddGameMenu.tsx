import { useState, useRef, useEffect } from 'react';

interface AddGameMenuProps {
  userId: string;
  onGameAdded: () => void;
  onSyncRA: () => void;
  onAddRAGame: () => void;
  onSyncPCSX2?: () => void;
  onSyncRPCS3?: () => void;
  onAutoLinkISOs?: () => void;
  onLinkPPSSPP?: () => void;
}

export const AddGameMenu: React.FC<AddGameMenuProps> = ({
  onSyncRA,
  onAddRAGame,
  onAutoLinkISOs,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50 font-semibold hover:bg-slate-700/50 transition-all duration-300 shadow-md text-white flex items-center gap-2"
      >
        <span>+ Add Game</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* RetroAchievements Section */}
          <div className="border-b border-slate-700/50">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              RetroAchievements
            </div>
            <button
              onClick={() => {
                onSyncRA();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors flex items-center gap-3 text-white"
            >
              <span className="text-lg">🎮</span>
              <span className="font-medium">Sync RA Library</span>
            </button>
            <button
              onClick={() => {
                onAddRAGame();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors flex items-center gap-3 text-white"
            >
              <span className="text-lg">➕</span>
              <span className="font-medium">Add RA Game</span>
            </button>
          </div>

          {/* PCSX2 Section */}
          <div className="border-b border-slate-700/50">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              PCSX2 (PS2)
            </div>
            <button
              onClick={() => {
                onAutoLinkISOs?.();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors flex items-center gap-3 text-white"
            >
              <span className="text-lg">🔗</span>
              <span className="font-medium">Auto-Link ISOs</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
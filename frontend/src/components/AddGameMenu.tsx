import { useState } from 'react';
import { AddMinecraftWorldModal } from './AddMinecraftWorldModal';
import { AddAppleGameModal } from './AddAppleGameModal';

interface AddGameMenuProps {
  userId: string;
  onGameAdded: () => void;
  onSyncRA?: () => void;
  onAddRAGame?: () => void;
  onSyncPCSX2?: () => void;
  onSyncRPCS3?: () => void;
  onAutoLinkISOs?: () => void;
  onLinkPPSSPP?: () => void;
}

export const AddGameMenu: React.FC<AddGameMenuProps> = ({ 
  userId, 
  onGameAdded,
  onSyncRA,
  onAddRAGame,
  onSyncPCSX2,
  onSyncRPCS3,
  onAutoLinkISOs,
  onLinkPPSSPP
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showMinecraftModal, setShowMinecraftModal] = useState(false);
  const [showAppleModal, setShowAppleModal] = useState(false);

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="px-6 py-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50 font-semibold hover:bg-slate-700/50 transition-all duration-300 shadow-md text-white"
        >
          + Add Game
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-2 w-64 bg-slate-800/95 border border-slate-700/50 rounded-xl shadow-xl z-50 overflow-hidden">
            {/* Main Games Section */}
            <button
              onClick={() => {
                setShowMenu(false);
                setShowMinecraftModal(true);
              }}
              className="w-full text-left px-4 py-2 hover:bg-slate-700/50 text-gray-300 hover:text-white transition-colors"
            >
              ⛏️ Add Minecraft World
            </button>

            <button
              onClick={() => {
                setShowMenu(false);
                setShowAppleModal(true);
              }}
              className="w-full text-left px-4 py-2 hover:bg-slate-700/50 text-gray-300 hover:text-white transition-colors"
            >
              🍎 Add Apple Game
            </button>

            {/* RetroAchievements Section */}
            {(onSyncRA || onAddRAGame || onSyncPCSX2 || onAutoLinkISOs) && (
              <div className="border-t border-slate-700/50">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  RetroAchievements
                </div>

                {onSyncRA && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onSyncRA();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-700/50 text-gray-300 hover:text-white transition-colors"
                  >
                    🎮 Sync RA Library
                  </button>
                )}

                {onAddRAGame && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onAddRAGame();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-700/50 text-gray-300 hover:text-white transition-colors"
                  >
                    ➕ Add RA Game
                  </button>
                )}
              </div>
            )}

            {/* PCSX2 Section */}
            {(onSyncPCSX2 || onAutoLinkISOs) && (
              <div className="border-t border-slate-700/50">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  PCSX2 (PS2)
                </div>

                {onAutoLinkISOs && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onAutoLinkISOs();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-700/50 text-gray-300 hover:text-white transition-colors"
                  >
                    🔗 Auto-Link ISOs
                  </button>
                )}

                {onSyncPCSX2 && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onSyncPCSX2();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-700/50 text-gray-300 hover:text-white transition-colors"
                  >
                    🕹️ Sync Playtime
                  </button>
                )}
              </div>
            )}

            {/* RPCS3 Section */}
            {onSyncRPCS3 && (
              <div className="border-t border-slate-700/50">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  RPCS3 (PS3)
                </div>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    onSyncRPCS3();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-700/50 text-gray-300 hover:text-white transition-colors"
                >
                  🎮 Sync Playtime
                </button>
              </div>
            )}

            {/* PPSSPP Section */}
            {onLinkPPSSPP && (
              <div className="border-t border-slate-700/50">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  PPSSPP (PSP)
                </div>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    onLinkPPSSPP();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-700/50 text-gray-300 hover:text-white transition-colors"
                >
                  🎮 Sync Playtime
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showMinecraftModal && (
        <AddMinecraftWorldModal
          userId={userId}
          onClose={() => setShowMinecraftModal(false)}
          onAdd={async () => {
            await onGameAdded();
          }}
        />
      )}

      {showAppleModal && (
        <AddAppleGameModal
          userId={userId}
          onClose={() => setShowAppleModal(false)}
          onAdd={async () => {
            await onGameAdded();
          }}
        />
      )}
    </>
  );
};
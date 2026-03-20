import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ProfilePageProps {
  user: any;
  onUpdate: () => void;
}

export default function ProfilePage({ user, onUpdate }: ProfilePageProps) {
  const [raUsername, setRaUsername] = useState(user.raUsername || '');
  const [raApiKey, setRaApiKey] = useState(user.raApiKey || '');
  const [saving, setSaving] = useState(false);

  const handleConnectSteam = () => {
    // Redirect to Steam OAuth with userId parameter
    window.location.href = `${API_URL}/api/auth/steam?userId=${user.id}`;
  };

  const handleDisconnectSteam = async () => {
    if (!confirm('Disconnect Steam account? This will not delete your games.')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/user/disconnect-steam`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Steam disconnected!');
        onUpdate();
      }
    } catch (error) {
      alert('Failed to disconnect Steam');
    }
  };

  const handleSaveRA = async () => {
    if (!raUsername.trim() || !raApiKey.trim()) {
      alert('Please enter both username and API key');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/user/connect-ra`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raUsername, raApiKey })
      });

      if (response.ok) {
        alert('RetroAchievements connected!');
        onUpdate();
      } else {
        alert('Failed to connect RetroAchievements');
      }
    } catch (error) {
      alert('Failed to connect RetroAchievements');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectRA = async () => {
    if (!confirm('Disconnect RetroAchievements?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/user/disconnect-ra`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setRaUsername('');
        setRaApiKey('');
        alert('RetroAchievements disconnected!');
        onUpdate();
      }
    } catch (error) {
      alert('Failed to disconnect');
    }
  };

  const toggleEmulator = async (emulator: 'PCSX2' | 'RPCS3' | 'PPSSPP') => {
    try {
      const token = localStorage.getItem('token');
      const field = `enable${emulator}`;
      const currentValue = (user as any)[field];

      const response = await fetch(`${API_URL}/api/user/toggle-emulator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emulator, enabled: !currentValue })
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      alert('Failed to toggle emulator');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* User Info Card */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 mb-8">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-4xl font-bold text-white">
            {user.username.charAt(0).toUpperCase()}
          </div>
          
          {/* Info */}
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-1">{user.displayName || user.username}</h2>
            <p className="text-gray-400 mb-2">@{user.username}</p>
            
            {/* Level & XP Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-300">Level {user.level}</span>
                <span className="text-sm text-gray-500">{user.xp} XP</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${(user.xp % 1000) / 10}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{1000 - (user.xp % 1000)} XP to Level {user.level + 1}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Connections */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-white mb-2">Account Links</h3>
        <p className="text-gray-400 mb-6">
          Connect your gaming platforms to automatically sync your library and track progress.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Steam */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a10 10 0 0 0-10 10 10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2M6.5 14.8l1.4.6c.2-.4.6-.8 1.1-.9l2.1-3c0-1.3 1.1-2.4 2.4-2.4 1.3 0 2.4 1.1 2.4 2.4 0 1.3-1.1 2.4-2.4 2.4h-.1l-2.9 2.1c-.2.9-1 1.6-2 1.6-.8 0-1.5-.5-1.8-1.2l-1.4-.6c.3 2.3 2.2 4 4.5 4 2.5 0 4.5-2 4.5-4.5S14.5 11 12 11c-.3 0-.6 0-.8.1l.7 1.6h.1c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5c-.7 0-1.3-.5-1.5-1.2l-1.6-.7c-.4.5-.9.8-1.5.8-.6 0-1.1-.3-1.4-.7z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-white">Steam</h4>
                  <p className="text-sm text-gray-400">{user.steamUsername || '-'}</p>
                </div>
              </div>
            </div>

            {user.steamId ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-green-400 font-medium">Linked</span>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Last updated: {user.steamLinkedAt ? new Date(user.steamLinkedAt).toLocaleDateString() : 'Never'}
                </p>
                <button
                  onClick={handleDisconnectSteam}
                  className="w-full px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all text-sm font-medium"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm text-gray-500 font-medium">Not linked</span>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Connect to sync your Steam library automatically
                </p>
                <button
                  onClick={handleConnectSteam}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-medium"
                >
                  Connect Steam
                </button>
              </>
            )}
          </div>

          {/* RetroAchievements */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🏆</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white">RetroAchievements</h4>
                  <p className="text-sm text-gray-400">{user.raUsername || '-'}</p>
                </div>
              </div>
            </div>

            {user.raUsername ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-green-400 font-medium">Linked</span>
                </div>
                <button
                  onClick={handleDisconnectRA}
                  className="w-full px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all text-sm font-medium"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm text-gray-500 font-medium">Not linked</span>
                </div>
                <div className="space-y-3 mb-4">
                  <input
                    type="text"
                    placeholder="Username"
                    value={raUsername}
                    onChange={(e) => setRaUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="API Key"
                    value={raApiKey}
                    onChange={(e) => setRaApiKey(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleSaveRA}
                  disabled={saving || !raUsername || !raApiKey}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-gray-500 text-white rounded-lg transition-all text-sm font-medium"
                >
                  {saving ? 'Connecting...' : 'Connect'}
                </button>
              </>
            )}
          </div>

          {/* PCSX2 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🎮</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white">PCSX2 (PS2)</h4>
                  <p className="text-sm text-gray-400">Local tracking</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Enable tracking</span>
              <button
                onClick={() => toggleEmulator('PCSX2')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  user.enablePCSX2 ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    user.enablePCSX2 ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* RPCS3 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🎮</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white">RPCS3 (PS3)</h4>
                  <p className="text-sm text-gray-400">Local tracking</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Enable tracking</span>
              <button
                onClick={() => toggleEmulator('RPCS3')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  user.enableRPCS3 ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    user.enableRPCS3 ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* PPSSPP */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🎮</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white">PPSSPP (PSP)</h4>
                  <p className="text-sm text-gray-400">Local tracking</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Enable tracking</span>
              <button
                onClick={() => toggleEmulator('PPSSPP')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  user.enablePPSSPP ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    user.enablePPSSPP ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
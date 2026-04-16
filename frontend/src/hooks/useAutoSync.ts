import { useState, useCallback } from 'react';
import autoSyncService from '../services/auto-sync.service';

interface AutoSyncStatus {
  lastSyncTime: string | null;
  cooldownMs: number;
}

export function useAutoSync() {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<AutoSyncStatus | null>(null);

  const triggerSync = useCallback(async () => {
    try {
      setSyncing(true);
      setError('');
      await autoSyncService.triggerAutoSync();
      
      const statusData = await autoSyncService.getAutoSyncStatus();
      setStatus(statusData.data);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger auto-sync');
      console.error('Auto-sync error:', err);
    } finally {
      setSyncing(false);
    }
  }, []);

  const getStatus = useCallback(async () => {
    try {
      const statusData = await autoSyncService.getAutoSyncStatus();
      setStatus(statusData.data);
    } catch (err: any) {
      console.error('Failed to fetch auto-sync status:', err);
    }
  }, []);

  return {
    syncing,
    error,
    status,
    triggerSync,
    getStatus
  };
}

import api from './api';

class AutoSyncService {

  async triggerAutoSync() {
    try {
      const response = await api.post('/auto-sync/trigger');
      return response.data;
    } catch (error: any) {
      console.error('Failed to trigger auto-sync:', error);
      throw error;
    }
  }

  async getAutoSyncStatus() {
    try {
      const response = await api.get('/auto-sync/status');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get auto-sync status:', error);
      throw error;
    }
  }
}

export default new AutoSyncService();

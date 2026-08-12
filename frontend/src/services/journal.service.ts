import api from './api';

export interface JournalEntry {
	id: string;
	userId: string;
	gameId: string;
	heading: string;
	content: string;
	createdAt: string;
	updatedAt: string;
}

class JournalService {
	// Get all entries for a game
	async getEntries(gameId: string, _userId: string): Promise<JournalEntry[]> {
		const response = await api.get(`/journal/${gameId}`);
		const data = response.data;
		
		if (!data.success) {
			throw new Error(data.error || 'Failed to fetch journal entries');
		}
		
		return data.data;
	}

	// Create a new entry
	async createEntry(_userId: string, gameId: string, heading: string, content: string): Promise<JournalEntry> {
		const response = await api.post('/journal', { gameId, heading, content });
		const data = response.data;
		
		if (!data.success) {
			throw new Error(data.error || 'Failed to create journal entry');
		}
		
		return data.data;
	}

	// Update an entry
	async updateEntry(entryId: string, _userId: string, heading: string, content: string): Promise<JournalEntry> {
		const response = await api.put(`/journal/${entryId}`, { heading, content });
		const data = response.data;
		
		if (!data.success) {
			throw new Error(data.error || 'Failed to update journal entry');
		}
		
		return data.data;
	}

	// Delete an entry
	async deleteEntry(entryId: string, _userId: string): Promise<void> {
		const response = await api.delete(`/journal/${entryId}`);
		const data = response.data;
		
		if (!data.success) {
			throw new Error(data.error || 'Failed to delete journal entry');
		}
	}
}

export default new JournalService();
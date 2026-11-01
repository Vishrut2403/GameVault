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
	async deleteEntry(entryId: string): Promise<void> {
		const response = await api.delete(`/journal/${entryId}`);
		const data = response.data;
		
		if (!data.success) {
			throw new Error(data.error || 'Failed to delete journal entry');
		}
	}
}

export default new JournalService();
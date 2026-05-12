import path from 'path';
import fs from 'fs';

let serialData: { byGameId: Record<string, string>; byName: Record<string, string> } | null = null;

function loadSerialData() {
	if (serialData) return serialData;
	
	try {
		const jsonPath = path.join(__dirname, '../data/ps2-serials.json');
		const raw = fs.readFileSync(jsonPath, 'utf-8');
		serialData = JSON.parse(raw);
	} catch (error) {
		console.warn('Failed to load ps2-serials.json, using fallback data:', error);
		serialData = {
			byGameId: {},
			byName: {}
		};
	}
	
	return serialData;
}

export function getSerialByGameId(gameId: string | number): string | null {
	const data = loadSerialData();
	return data?.byGameId[String(gameId)] || null;
}

export function getSerialByName(gameName: string): string | null {
	const data = loadSerialData();
	const normalized = gameName.toLowerCase().trim();
	return data?.byName[normalized] || null;
}
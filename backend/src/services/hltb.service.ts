import axios from 'axios';

const BASE = 'https://hltbapi.codepotatoes.de';

export interface HltbTimes {
	name: string;
	gameplayMain: number; // hours
	gameplayMainExtra: number;
	gameplayCompletionist: number;
}

// Raw responses by lookup key; null records a confirmed miss (404) so it isn't
// asked again. Transient failures are not cached.
const cache = new Map<string, any | null>();

async function cachedLookup(key: string, fetch: () => Promise<any | null>): Promise<HltbTimes | null> {
	if (cache.has(key)) {
		const cached = cache.get(key);
		return cached ? normalise(cached) : null;
	}
	try {
		const raw = await fetch();
		cache.set(key, raw ?? null);
		return raw ? normalise(raw) : null;
	} catch (err: any) {
		if (err?.response?.status === 404) {
			cache.set(key, null);
			return null;
		}
		throw err;
	}
}

/** HLTB times for a Steam app, or null when HLTB has no entry. Throws on network or server errors. */
export function hltbBySteamAppId(appId: string): Promise<HltbTimes | null> {
	return cachedLookup(`steam:${appId}`, async () => (await axios.get(`${BASE}/steam/${appId}`, { timeout: 8000 })).data);
}

/** HLTB times for the best name match, or null when there is none. Throws on network or server errors. */
export function hltbByName(gameName: string): Promise<HltbTimes | null> {
	return cachedLookup(`name:${gameName.toLowerCase()}`, async () => {
		const { data } = await axios.get(`${BASE}/search/${encodeURIComponent(gameName)}`, { timeout: 8000 });
		return Array.isArray(data) ? data[0] : data;
	});
}

function normalise(raw: any): HltbTimes {
	return {
		name:                  raw.title          ?? raw.name          ?? '',
		gameplayMain:          raw.mainStory       ?? raw.gameplayMain  ?? 0,
		gameplayMainExtra:     raw.mainStoryWithExtras ?? raw.gameplayMainExtra ?? 0,
		gameplayCompletionist: raw.completionist   ?? raw.gameplayCompletionist ?? 0,
	};
}

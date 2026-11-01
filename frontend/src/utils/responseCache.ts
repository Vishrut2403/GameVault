/** In-memory GET cache: one request per URL at a time, and nothing kept from a request that outlives clear(). */
export function createResponseCache(fetch: (url: string) => Promise<unknown>) {
	const cache = new Map<string, unknown>();
	const inFlight = new Map<string, Promise<unknown>>();
	let generation = 0;

	function load(url: string): Promise<unknown> {
		let request = inFlight.get(url);
		if (!request) {
			const startedIn = generation;
			request = fetch(url)
				.then((body) => {
					if (startedIn === generation) cache.set(url, body);
					return body;
				})
				.finally(() => {
					if (inFlight.get(url) === request) inFlight.delete(url);
				});
			inFlight.set(url, request);
		}
		return request;
	}

	return {
		load,
		peek: (url: string) => cache.get(url),
		has: (url: string) => cache.has(url),
		clear() {
			generation++;
			cache.clear();
			inFlight.clear();
		},
	};
}

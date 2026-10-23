import { useCallback, useEffect, useState } from 'react';
import api from './api';

// Tabs unmount when you switch away, so without this every visit refetched
// behind a spinner. Responses are kept in memory for the page's lifetime
// (a reload starts empty): a revisited tab shows its last data at once and
// refreshes it in the background.
const cache = new Map<string, unknown>();
const inFlight = new Map<string, Promise<unknown>>();
// Bumped by clearCache, so a request that was already out at logout can't
// write the previous user's response back in when it lands.
let generation = 0;

function load(url: string): Promise<unknown> {
	let request = inFlight.get(url);
	if (!request) {
		const startedIn = generation;
		request = api.get(url)
			.then((response) => {
				if (startedIn === generation) cache.set(url, response.data);
				return response.data;
			})
			.finally(() => inFlight.delete(url));
		inFlight.set(url, request);
	}
	return request;
}

/** Forget everything cached, so the next user to sign in never sees the last one's data. */
export function clearCache(): void {
	generation++;
	cache.clear();
	inFlight.clear();
}

/** Warm the cache for a tab that hasn't been opened yet. Failures are left for the tab to report. */
export function prefetch(url: string): void {
	if (!cache.has(url)) load(url).catch(() => {});
}

/**
 * The response body for GET `url`: cached data straight away when there is
 * some, refreshed on mount and whenever `refreshKey` changes. `reload` refetches
 * on demand, e.g. after a change the server should reflect.
 */
export function useCachedGet<T>(url: string, refreshKey?: unknown) {
	const [data, setData] = useState<T | undefined>(() => cache.get(url) as T | undefined);
	const [error, setError] = useState<unknown>(null);

	const reload = useCallback(() => load(url).then(
		(body) => { setData(body as T); setError(null); },
		(err) => setError(err),
	), [url]);

	useEffect(() => {
		reload();
	}, [reload, refreshKey]);

	return { data, error, loading: data === undefined && error === null, reload };
}

export const smartPicksUrl = (userId: string, limit: number) => `/recommendations/${userId}/smart?limit=${limit}`;
export const WISHLIST_URL = '/wishlist';

/** Sessions for the last year. Date-only, so the URL — and the cache entry — is stable for the day. */
export const sessionsUrl = () => {
	const start = new Date();
	start.setFullYear(start.getFullYear() - 1);
	return `/user/sessions?startDate=${start.toISOString().slice(0, 10)}`;
};

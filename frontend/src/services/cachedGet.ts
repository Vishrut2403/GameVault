import { useCallback, useEffect, useState } from 'react';
import api from './api';
import { createResponseCache } from '../utils/responseCache';

// Lets a revisited tab show its last data at once while it refreshes.
const responses = createResponseCache((url) => api.get(url).then((response) => response.data));

/** Forget everything cached, so the next user to sign in never sees the last one's data. */
export function clearCache(): void {
	responses.clear();
}

/** Warm the cache for a tab that hasn't been opened yet. */
export function prefetch(url: string): void {
	if (!responses.has(url)) responses.load(url).catch(() => {});
}

/** GET `url`: cached data at once, refreshed on mount and when `refreshKey` changes. */
export function useCachedGet<T>(url: string, refreshKey?: unknown) {
	const [data, setData] = useState<T | undefined>(() => responses.peek(url) as T | undefined);
	const [error, setError] = useState<unknown>(null);

	const reload = useCallback(() => responses.load(url).then(
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
export const BACKLOG_PLAN_URL = '/predictions/backlog-plan';

/** Last year's sessions. Date-only, so the URL stays cacheable all day. */
export const sessionsUrl = () => {
	const start = new Date();
	start.setFullYear(start.getFullYear() - 1);
	return `/user/sessions?startDate=${start.toISOString().slice(0, 10)}`;
};

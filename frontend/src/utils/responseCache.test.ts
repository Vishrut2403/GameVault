import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResponseCache } from './responseCache';

// A fetcher whose responses the test settles by hand.
function fakeFetch() {
	const pending: { url: string; resolve: (body: unknown) => void; reject: (err: Error) => void }[] = [];
	const fetch = (url: string) => new Promise<unknown>((resolve, reject) => { pending.push({ url, resolve, reject }); });
	return { fetch, pending };
}

test('concurrent loads of a URL share one request, and the body is cached', async () => {
	const { fetch, pending } = fakeFetch();
	const cache = createResponseCache(fetch);

	const a = cache.load('/wishlist');
	const b = cache.load('/wishlist');
	assert.equal(pending.length, 1);

	pending[0].resolve({ items: 6 });
	assert.deepEqual(await a, { items: 6 });
	assert.deepEqual(await b, { items: 6 });
	assert.deepEqual(cache.peek('/wishlist'), { items: 6 });
});

test('a failed request is not cached, and the next load asks again', async () => {
	const { fetch, pending } = fakeFetch();
	const cache = createResponseCache(fetch);

	const first = cache.load('/wishlist');
	pending[0].reject(new Error('502'));
	await assert.rejects(first);
	assert.equal(cache.has('/wishlist'), false);

	cache.load('/wishlist');
	assert.equal(pending.length, 2);
});

test('a request still out at clear() never caches the previous user\'s data', async () => {
	const { fetch, pending } = fakeFetch();
	const cache = createResponseCache(fetch);

	const before = cache.load('/wishlist');
	cache.clear();
	const after = cache.load('/wishlist');
	assert.equal(pending.length, 2, 'a load after clear() starts its own request');

	pending[0].resolve('old user');
	await before;
	assert.equal(cache.has('/wishlist'), false);

	cache.load('/wishlist');
	assert.equal(pending.length, 2, 'the old request finishing must not drop the new one from in-flight');

	pending[1].resolve('new user');
	await after;
	assert.equal(cache.peek('/wishlist'), 'new user');
});

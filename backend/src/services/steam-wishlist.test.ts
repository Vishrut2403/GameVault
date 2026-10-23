import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toWishlistRow, nextManualSyncAt, noteSyncAttempt, MANUAL_SYNC_COOLDOWN_MS } from './steam-wishlist.service';

test('toWishlistRow reads paise strings as rupees at full price', () => {
	const row = toWishlistRow({ appid: 1030300, name: 'Hollow Knight: Silksong', best_purchase_option: { final_price_in_cents: '88000' } });
	assert.deepEqual(row, {
		appId: '1030300',
		name: 'Hollow Knight: Silksong',
		listPrice: 880,
		currentPrice: 880,
		discountPercent: 0,
		imageUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1030300/header.jpg',
	});
});

test('toWishlistRow keeps the original price and discount of a sale', () => {
	const row = toWishlistRow({ appid: 1, name: 'On sale', best_purchase_option: { final_price_in_cents: '50000', original_price_in_cents: '100000', discount_pct: 50 } });
	assert.equal(row?.listPrice, 1000);
	assert.equal(row?.currentPrice, 500);
	assert.equal(row?.discountPercent, 50);
});

test('toWishlistRow works out the discount when Steam omits it', () => {
	const row = toWishlistRow({ appid: 1, name: 'On sale', best_purchase_option: { final_price_in_cents: 75000, original_price_in_cents: 100000 } });
	assert.equal(row?.discountPercent, 25);
});

test('toWishlistRow prices an unreleased game at 0, and skips items without an app id', () => {
	const row = toWishlistRow({ appid: 4328440, name: 'Cat Parents' });
	assert.equal(row?.currentPrice, 0);
	assert.equal(row?.listPrice, 0);
	assert.equal(row?.discountPercent, 0);
	assert.equal(toWishlistRow({ name: 'no id' }), null);
});

test('a manual sync is allowed again only once the cooldown has passed', () => {
	const at = Date.UTC(2026, 9, 23, 12, 0);
	assert.equal(nextManualSyncAt('never-synced', at), null);
	noteSyncAttempt('user-1', at);
	assert.equal(nextManualSyncAt('user-1', at + 60_000), at + MANUAL_SYNC_COOLDOWN_MS);
	assert.equal(nextManualSyncAt('user-1', at + MANUAL_SYNC_COOLDOWN_MS - 1), at + MANUAL_SYNC_COOLDOWN_MS);
	assert.equal(nextManualSyncAt('user-1', at + MANUAL_SYNC_COOLDOWN_MS), null);
	assert.equal(nextManualSyncAt('user-2', at + 60_000), null, 'cooldowns are per user');
});

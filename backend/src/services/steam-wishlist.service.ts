import axios from 'axios';
import prisma from '../prisma';

// Two calls per sync (wishlist, then batched store items); both endpoints are undocumented.
const API = 'https://api.steampowered.com';
// The store region prices are fetched for; the app shows rupees.
const STORE_COUNTRY = 'IN';
const ITEMS_PER_REQUEST = 100;
// Optional; counts calls against the key's quota instead of the shared IP.
const apiKey = () => process.env.STEAM_API_KEY || undefined;

// Manual syncs only; in memory, so a restart allows at most one extra.
export const MANUAL_SYNC_COOLDOWN_MS = 10 * 60 * 1000;
const lastSyncAt = new Map<string, number>();

/** When this user may next sync by hand (ms since epoch), or null if they can now. */
export function nextManualSyncAt(userId: string, now = Date.now()): number | null {
	const last = lastSyncAt.get(userId);
	return last !== undefined && now - last < MANUAL_SYNC_COOLDOWN_MS ? last + MANUAL_SYNC_COOLDOWN_MS : null;
}

export function noteSyncAttempt(userId: string, at = Date.now()): void {
	lastSyncAt.set(userId, at);
}

interface StoreItem {
	appid?: number;
	name?: string;
	best_purchase_option?: {
		final_price_in_cents?: string | number;
		original_price_in_cents?: string | number;
		discount_pct?: number;
	};
}

export interface WishlistRow {
	appId: string;
	name: string;
	listPrice: number;
	currentPrice: number;
	discountPercent: number;
	imageUrl: string;
}

/** Prices arrive in paise as strings; no purchase option yet means 0. */
export function toWishlistRow(item: StoreItem): WishlistRow | null {
	if (!item.appid) return null;
	const option = item.best_purchase_option;
	const currentPrice = Number(option?.final_price_in_cents ?? 0) / 100;
	const listPrice = option?.original_price_in_cents != null ? Number(option.original_price_in_cents) / 100 : currentPrice;
	const discountPercent = option?.discount_pct
		?? (listPrice > 0 ? Math.round(((listPrice - currentPrice) / listPrice) * 100) : 0);
	return {
		appId: String(item.appid),
		name: item.name || `App ${item.appid}`,
		listPrice,
		currentPrice,
		discountPercent,
		imageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.appid}/header.jpg`,
	};
}

/** Every game on a public Steam wishlist, with current store prices. */
export async function fetchSteamWishlist(steamId: string): Promise<WishlistRow[]> {
	const { data } = await axios.get(`${API}/IWishlistService/GetWishlist/v1/`, { params: { key: apiKey(), steamid: steamId }, timeout: 10_000 });
	const appIds: number[] = (data?.response?.items ?? []).map((item: { appid: number }) => item.appid);

	const rows: WishlistRow[] = [];
	for (let i = 0; i < appIds.length; i += ITEMS_PER_REQUEST) {
		const input = {
			ids: appIds.slice(i, i + ITEMS_PER_REQUEST).map((appid) => ({ appid })),
			context: { language: 'english', country_code: STORE_COUNTRY },
			data_request: { include_basic_info: true },
		};
		const { data: store } = await axios.get(`${API}/IStoreBrowseService/GetItems/v1/`, {
			params: { key: apiKey(), input_json: JSON.stringify(input) },
			timeout: 10_000,
		});
		for (const item of store?.response?.store_items ?? []) {
			const row = toWishlistRow(item);
			if (row) rows.push(row);
		}
	}
	return rows;
}

/** Mirror the Steam wishlist; `manual_` entries stay unless a same-name Steam game takes them over. */
export async function syncSteamWishlist(userId: string, steamId: string) {
	noteSyncAttempt(userId);
	const rows = await fetchSteamWishlist(steamId);

	for (const row of rows) {
		const prices = { name: row.name, listPrice: row.listPrice, currentPrice: row.currentPrice, discountPercent: row.discountPercent, imageUrl: row.imageUrl };
		const existing = await prisma.steamWishlist.findUnique({ where: { userId_appId: { userId, appId: row.appId } } });
		if (existing) {
			await prisma.steamWishlist.update({ where: { id: existing.id }, data: prices });
			continue;
		}
		const manual = await prisma.steamWishlist.findFirst({
			where: { userId, appId: { startsWith: 'manual_' }, name: { equals: row.name, mode: 'insensitive' } },
		});
		if (manual) {
			await prisma.steamWishlist.update({ where: { id: manual.id }, data: { appId: row.appId, ...prices } });
		} else {
			await prisma.steamWishlist.create({ data: { userId, appId: row.appId, tags: [], ...prices } });
		}
	}

	// An empty response (private profile, Steam hiccup) never removes anything.
	let removed = 0;
	if (rows.length > 0) {
		const result = await prisma.steamWishlist.deleteMany({
			where: { userId, appId: { notIn: rows.map((row) => row.appId), not: { startsWith: 'manual_' } } },
		});
		removed = result.count;
	}

	return { synced: rows.length, removed };
}

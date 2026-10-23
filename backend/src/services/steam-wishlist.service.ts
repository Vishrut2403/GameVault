import axios from 'axios';
import prisma from '../prisma';

// Two keyless calls per sync, however long the wishlist: the wishlist itself,
// then store details for every game on it in batches. The old approach of one
// store request per game is what ran into Steam's per-IP rate limit. Both
// endpoints are the ones Steam's own store uses but are undocumented, so a
// failure here is logged by the caller and the last saved wishlist stays.
const API = 'https://api.steampowered.com';
// The store region prices are fetched for; the app shows rupees.
const STORE_COUNTRY = 'IN';
const ITEMS_PER_REQUEST = 100;

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

/**
 * A store item as a wishlist row. Prices arrive in paise, as strings. A game
 * with no purchase option yet (unreleased, say) gets 0 for both prices.
 */
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
	const { data } = await axios.get(`${API}/IWishlistService/GetWishlist/v1/`, { params: { steamid: steamId }, timeout: 10_000 });
	const appIds: number[] = (data?.response?.items ?? []).map((item: { appid: number }) => item.appid);

	const rows: WishlistRow[] = [];
	for (let i = 0; i < appIds.length; i += ITEMS_PER_REQUEST) {
		const input = {
			ids: appIds.slice(i, i + ITEMS_PER_REQUEST).map((appid) => ({ appid })),
			context: { language: 'english', country_code: STORE_COUNTRY },
			data_request: { include_basic_info: true },
		};
		const { data: store } = await axios.get(`${API}/IStoreBrowseService/GetItems/v1/`, {
			params: { input_json: JSON.stringify(input) },
			timeout: 10_000,
		});
		for (const item of store?.response?.store_items ?? []) {
			const row = toWishlistRow(item);
			if (row) rows.push(row);
		}
	}
	return rows;
}

/**
 * Mirror the user's Steam wishlist into theirs: add new games, refresh names
 * and prices, and drop games removed on Steam. Manually added games (app ids
 * starting `manual_`) are left alone, except that one with the same name as a
 * Steam wishlist game is taken over by it, keeping its tags and HLTB data.
 */
export async function syncSteamWishlist(userId: string, steamId: string) {
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

	// A private profile or a Steam hiccup also returns an empty wishlist, so
	// an empty result never removes anything.
	let removed = 0;
	if (rows.length > 0) {
		const result = await prisma.steamWishlist.deleteMany({
			where: { userId, appId: { notIn: rows.map((row) => row.appId), not: { startsWith: 'manual_' } } },
		});
		removed = result.count;
	}

	return { synced: rows.length, removed };
}

import axios from 'axios';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const CACHE_TTL = 3600;
const API_TIMEOUT = 3000;

dotenv.config();

const cache = new NodeCache({ stdTTL: CACHE_TTL });

const STEAM_API_BASE = 'https://api.steampowered.com';
const STEAM_STORE_API = 'https://store.steampowered.com/api';

export interface SteamGame {
	appid: number;
	name: string;
	playtime_forever: number;
	playtime_2weeks?: number;
	img_icon_url?: string;
	img_logo_url?: string;
}

interface SteamLibraryResponse {
	response: {
		game_count: number;
		games: SteamGame[];
	};
}

interface StoreAppDetails {
	success: boolean;
	data?: {
		name: string;
		is_free: boolean;
		genres?: Array<{ description: string }>;
		price_overview?: {
			currency: string;
			initial: number;
			final: number;
			discount_percent: number;
		};
	};
}

interface AchievementData {
	total: number;
	completed: number;
	percentage: number;
}

class SteamService {
	private apiKey: string;

	constructor() {
		this.apiKey = process.env.STEAM_API_KEY || '';

		 if (!this.apiKey) {
			throw new Error('STEAM_API_KEY is not configured');
		}
	}

	private async getGameAchievements(steamId: string, appId: number): Promise<AchievementData | null> {
		const cacheKey = `achievements_${steamId}_${appId}`;
		const cached = cache.get<AchievementData>(cacheKey);

		if (cached) {
			return cached;
		}

		try {
			const schemaUrl = `${STEAM_API_BASE}/ISteamUserStats/GetSchemaForGame/v2/`;
			const schemaResponse = await axios.get(schemaUrl, {
				params: { key: this.apiKey, appid: appId },
				timeout: API_TIMEOUT,
			});

			const totalAchievements = schemaResponse.data.game?.availableGameStats?.achievements?.length || 0;

			if (totalAchievements === 0) {
				return null;
			}

			const statsUrl = `${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/`;
			const statsResponse = await axios.get(statsUrl, {
				params: { key: this.apiKey, steamid: steamId, appid: appId },
				timeout: API_TIMEOUT,
			});

			const achievements = statsResponse.data.playerstats?.achievements || [];
			const completedCount = achievements.filter((a: any) => a.achieved === 1).length;
			const percentage = totalAchievements > 0 ? (completedCount / totalAchievements) * 100 : 0;

			const result = {
				total: totalAchievements,
				completed: completedCount,
				percentage: Math.round(percentage),
			};

			cache.set(cacheKey, result, CACHE_TTL);
			return result;
		} catch (error) {
			return null;
		}
	}

	private async findOrCreateUser(steamId: string, username?: string) {
		const user = await prisma.user.upsert({
			where: { steamId },
			update: {
				steamUsername: username || undefined,
				updatedAt: new Date(),
			},
			create: {
				email: `steam_${steamId}@temp.com`,
				password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
				username: `steam_${steamId}`,
				steamId,
				steamUsername: username || null,
			},
		});
		return user;
	}

	async saveLibrary(steamId: string, games: SteamGame[]) {
		const user = await this.findOrCreateUser(steamId);

		for (const game of games) {
				await prisma.libraryGame.upsert({
					where: {
						userId_platformGameId_platform: {
							userId: user.id,
							platformGameId: String(game.appid),
							platform: 'steam'
						},
					},
					update: {
						playtimeForever: game.playtime_forever,
						imageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
						platformData: {
							imgIconUrl: game.img_icon_url || null,
							imgLogoUrl: game.img_logo_url || null,
						}
					},
					create: {
						userId: user.id,
						platform: 'steam',
						platformGameId: String(game.appid),
						name: game.name,
						playtimeForever: game.playtime_forever,
						imageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
						platformData: {
							imgIconUrl: game.img_icon_url || null,
							imgLogoUrl: game.img_logo_url || null,
						}
					},
				});
		}
		this.fetchAchievementsInBackground(steamId, user.id, games).catch(() => {});
	}

	private async fetchAchievementsInBackground(steamId: string, userId: string, games: SteamGame[]) {

		for (const game of games) {

				const achievements = await this.getGameAchievements(steamId, game.appid);

				if (achievements) {
					await prisma.libraryGame.update({
						where: {
							userId_platformGameId_platform: {
								userId: userId,
								platformGameId: String(game.appid),
								platform: 'steam'
							},
						},
						data: {
							achievementsTotal: achievements.total,
							achievementsEarned: achievements.completed,
						},
					});
				}
		}
	}

	async getUserLibrary(steamId: string): Promise<SteamGame[]> {
		const cacheKey = `library_${steamId}`;
		const cached = cache.get<SteamGame[]>(cacheKey);

		if (cached) {
			return cached;
		}

		try {
			const url = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/`;
			const response = await axios.get<SteamLibraryResponse>(url, {
				params: {
					key: this.apiKey,
					steamid: steamId,
					include_appinfo: 1,
					include_played_free_games: 1,
					format: 'json'
				}
			});

			const games = response.data.response.games || [];
			cache.set(cacheKey, games);

			return games;
		} catch (error) {
			throw new Error('Failed to fetch Steam library');
		}
	}

	async getEnrichedLibrary(steamId: string) {
		const user = await prisma.user.findUnique({ 
			where: { steamId },
			include: {
				games: {
					where: { platform: 'steam' },
					orderBy: [
						{ status: 'asc' },
						{ playtimeForever: 'desc' }
					]
				}
			}
		});

		if (!user) {
			return { userId: null, count: 0, games: [] };
		}

		return {
			userId: user.id,
			count: user.games.length,
			games: user.games
		};
	}

	private async getAppDetails(appId: number): Promise<StoreAppDetails> {
		const cacheKey = `appdetails_${appId}`;
		const cached = cache.get<StoreAppDetails>(cacheKey);

		if (cached) {
			return cached;
		}

		try {
			const url = `${STEAM_STORE_API}/appdetails`;
			const response = await axios.get<Record<string, StoreAppDetails>>(url, {
				params: { appids: appId, cc: 'in', l: 'english' }
			});

			const result = response.data[appId];
			cache.set(cacheKey, result, 3600);
			return result;
		} catch (error) {
			return { success: false };
		}
	}

	async getPlayerSummary(steamId: string) {
		const cacheKey = `player_${steamId}`;
		const cached = cache.get(cacheKey);

		if (cached) {
			return cached;
		}

		try {
			const url = `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/`;
			const response = await axios.get(url, {
				params: { key: this.apiKey, steamids: steamId }
			});

			const player = response.data.response.players[0];
			cache.set(cacheKey, player);
			return player;
		} catch (error) {
			throw new Error('Failed to fetch player data');
		}
	}
}

export default new SteamService();
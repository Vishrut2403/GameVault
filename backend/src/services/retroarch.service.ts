import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import prisma from '../prisma';

const RETROARCH_BASE = path.join(os.homedir(), '.config', 'retroarch');
const PLAYLISTS_DIR  = path.join(RETROARCH_BASE, 'playlists');
const LOGS_DIR       = path.join(PLAYLISTS_DIR, 'logs');

const CORE_TO_PLATFORM: Record<string, string> = {
  // Nintendo
  'mGBA':             'Game Boy Advance',
  'Gambatte':         'Game Boy',
  'SameBoy':          'Game Boy',
  'bsnes':            'SNES',
  'Snes9x':           'SNES',
  'Mesen':            'NES',
  'FCEUmm':           'NES',
  'Mupen64Plus-Next': 'Nintendo 64',
  'ParaLLEl N64':     'Nintendo 64',
  'melonDS':          'Nintendo DS',
  'Citra':            'Nintendo 3DS',
  // Sega
  'Genesis Plus GX':  'Sega Genesis',
  'PicoDrive':        'Sega Genesis',
  'Beetle Saturn':    'Sega Saturn',
  'Yabause':          'Sega Saturn',
  'Flycast':          'Dreamcast',
  // PlayStation
  'Beetle PSX':       'PlayStation',
  'PCSX-ReARMed':     'PlayStation',
  'DuckStation':      'PlayStation',
  'Beetle PSX HW':    'PlayStation',
  // Arcade
  'FinalBurn Neo':    'Arcade',
  'MAME':             'Arcade',
  // Atari
  'Stella':           'Atari 2600',
  'Hatari':           'Atari ST',
};

const SYSTEM_TO_THUMBNAIL: Record<string, string> = {
  'Nintendo - Game Boy Advance': 'Nintendo - Game Boy Advance',
  'Nintendo - Game Boy':         'Nintendo - Game Boy',
  'Nintendo - Super Nintendo Entertainment System': 'Nintendo - Super Nintendo Entertainment System',
  'Nintendo - Nintendo Entertainment System':       'Nintendo - Nintendo Entertainment System',
  'Nintendo - Nintendo 64':      'Nintendo - Nintendo 64',
  'Nintendo - Nintendo DS':      'Nintendo - Nintendo DS',
  'Sega - Mega Drive - Genesis': 'Sega - Mega Drive - Genesis',
  'Sega - Saturn':               'Sega - Saturn',
  'Sega - Dreamcast':            'Sega - Dreamcast',
  'Sony - PlayStation':          'Sony - PlayStation',
};

interface LrtlData {
  playtimeMinutes: number;
  lastPlayed:      Date | null;
  playCount:       number;
}

interface RetroArchGame {
  name:            string;
  romPath:         string;
  system:          string;
  platform:        string;
  playtimeMinutes: number;
  lastPlayed:      Date | null;
  playCount:       number;
  imageUrl:        string | null;
}

function parseRuntime(runtime: string): number {
  const parts = runtime.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 60 + parts[1] + Math.round(parts[2] / 60);
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function readLrtl(coreName: string, gameName: string): LrtlData {
  const lrtlPath = path.join(LOGS_DIR, coreName, `${gameName}.lrtl`);

  if (!fs.existsSync(lrtlPath)) {
    return { playtimeMinutes: 0, lastPlayed: null, playCount: 0 };
  }

  try {
    const raw  = fs.readFileSync(lrtlPath, 'utf-8');
    const data = JSON.parse(raw);

    return {
      playtimeMinutes: parseRuntime(data.runtime || '0:00:00'),
      lastPlayed:      data.last_played ? new Date(data.last_played) : null,
      playCount:       parseInt(data.play_count || '0', 10),
    };
  } catch {
    return { playtimeMinutes: 0, lastPlayed: null, playCount: 0 };
  }
}

function buildCoverUrl(system: string, gameName: string): string | null {
  const thumbnailSystem = SYSTEM_TO_THUMBNAIL[system];
  if (!thumbnailSystem) return null;

  const safeName = gameName.replace(/[&*/:`<>?\\|"]/g, '_');
  return `https://thumbnails.libretro.com/${encodeURIComponent(thumbnailSystem)}/Named_Boxarts/${encodeURIComponent(safeName)}.png`;
}

function parseAllPlaylists(): RetroArchGame[] {
  if (!fs.existsSync(PLAYLISTS_DIR)) {
    return [];
  }

  const games: RetroArchGame[] = [];

  const lplFiles = fs.readdirSync(PLAYLISTS_DIR)
    .filter(f => f.endsWith('.lpl'));

  for (const lplFile of lplFiles) {
    const system = lplFile.replace(/\.lpl$/, '');

    let playlist: any;
    try {
      const raw = fs.readFileSync(path.join(PLAYLISTS_DIR, lplFile), 'utf-8');
      playlist  = JSON.parse(raw);
    } catch {
      console.warn(`[RetroArch] Failed to parse ${lplFile}`);
      continue;
    }

    const items: any[] = playlist.items || [];

    for (const item of items) {
      const gameName = item.label || path.basename(item.path || '', path.extname(item.path || ''));

      let lrtl: LrtlData = { playtimeMinutes: 0, lastPlayed: null, playCount: 0 };
      let detectedCore   = '';

      if (fs.existsSync(LOGS_DIR)) {
        const coreFolders = fs.readdirSync(LOGS_DIR);
        for (const core of coreFolders) {
          const candidate = readLrtl(core, gameName);
          if (candidate.playtimeMinutes > 0 || candidate.playCount > 0) {
            lrtl         = candidate;
            detectedCore = core;
            break;
          }
        }
      }

      const platform = CORE_TO_PLATFORM[detectedCore] || system.split(' - ').pop() || 'RetroArch';

      games.push({
        name:            gameName,
        romPath:         item.path || '',
        system,
        platform,
        playtimeMinutes: lrtl.playtimeMinutes,
        lastPlayed:      lrtl.lastPlayed,
        playCount:       lrtl.playCount,
        imageUrl:        buildCoverUrl(system, gameName),
      });
    }
  }

  return games;
}

class RetroArchService {

  async getInstances(): Promise<RetroArchGame[]> {
    return parseAllPlaylists();
  }

  async syncLibrary(userId: string): Promise<{ synced: number; updated: number }> {
    const games = parseAllPlaylists();

    if (games.length === 0) {
      return { synced: 0, updated: 0 };
    }

    let synced  = 0;
    let updated = 0;

    for (const game of games) {
      const platformGameId = path.basename(game.romPath, path.extname(game.romPath)) || game.name;

      const existing = await prisma.libraryGame.findFirst({
        where: { userId, platformGameId, platform: 'retroachievements' },
      });

      if (existing) {
        if (
          existing.playtimeForever !== game.playtimeMinutes ||
          existing.lastPlayedAt?.getTime() !== game.lastPlayed?.getTime()
        ) {
          await prisma.libraryGame.update({
            where: { id: existing.id },
            data: {
              playtimeForever: game.playtimeMinutes,
              lastPlayedAt:    game.lastPlayed,
              platformData:    {
                ...(existing.platformData as object || {}),
                system:    game.system,
                platform:  game.platform,
                playCount: game.playCount,
              },
            },
          });
          updated++;
        }
      } else {
        await prisma.libraryGame.create({
          data: {
            userId,
            platform:        'retroachievements',
            platformGameId,
            name:            game.name,
            imageUrl:        game.imageUrl,
            playtimeForever: game.playtimeMinutes,
            lastPlayedAt:    game.lastPlayed,
            status:          'unplayed',
            platformData:    {
              system:    game.system,
              platform:  game.platform,
              playCount: game.playCount,
              romPath:   game.romPath,
            },
          },
        });
        synced++;
      }
    }

    console.log(`[RetroArch] Sync complete: ${synced} new, ${updated} updated`);
    return { synced, updated };
  }
}

export default new RetroArchService();
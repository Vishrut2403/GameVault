import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseStringPromise } from 'xml2js';

interface RPCS3Trophy {
  id: number;
  name: string;
  detail: string;
  type: 'bronze' | 'silver' | 'gold' | 'platinum';
  hidden: boolean;
  unlocked: boolean;
  unlockedAt?: Date;
}

interface RPCS3TrophySet {
  npCommId: string;
  gameName: string;
  trophies: RPCS3Trophy[];
  totalTrophies: number;
  unlockedTrophies: number;
  bronze: { total: number; unlocked: number };
  silver: { total: number; unlocked: number };
  gold: { total: number; unlocked: number };
  platinum: { total: number; unlocked: number };
  completionPercent: number;
}

export class RPCS3TrophyService {
  private trophyPath: string;

  constructor(customPath?: string) {
    const homeDir = os.homedir();
    
    if (customPath) {
      this.trophyPath = customPath;
    } else if (process.platform === 'linux') {
      this.trophyPath = path.join(homeDir, '.config', 'rpcs3', 'dev_hdd0', 'home', '00000001', 'trophy');
    } else if (process.platform === 'win32') {
      this.trophyPath = path.join(homeDir, 'AppData', 'Roaming', 'rpcs3', 'dev_hdd0', 'home', '00000001', 'trophy');
    } else if (process.platform === 'darwin') {
      this.trophyPath = path.join(homeDir, 'Library', 'Application Support', 'rpcs3', 'dev_hdd0', 'home', '00000001', 'trophy');
    } else {
      this.trophyPath = path.join(homeDir, '.config', 'rpcs3', 'dev_hdd0', 'home', '00000001', 'trophy');
    }
  }

  trophyDirExists(): boolean {
    return fs.existsSync(this.trophyPath);
  }

  async getAllTrophySets(): Promise<RPCS3TrophySet[]> {
    if (!this.trophyDirExists()) {
      throw new Error(`RPCS3 trophy directory not found at: ${this.trophyPath}`);
    }

    const trophySets: RPCS3TrophySet[] = [];
    const entries = fs.readdirSync(this.trophyPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const trophySet = await this.parseTrophySet(entry.name);
          if (trophySet) {
            trophySets.push(trophySet);
          }
        } catch (err) {
          console.error(`Error parsing trophy set ${entry.name}:`, err);
        }
      }
    }

    return trophySets;
  }

  private async parseTrophySet(npCommId: string): Promise<RPCS3TrophySet | null> {
    const setPath = path.join(this.trophyPath, npCommId);
    const tropConfPath = path.join(setPath, 'TROPCONF.SFM');
    const tropUsrPath = path.join(setPath, 'TROPUSR.DAT');

    if (!fs.existsSync(tropConfPath)) {
      return null;
    }

    try {
      const tropConfData = fs.readFileSync(tropConfPath, 'utf8');
      const tropConf = await parseStringPromise(tropConfData);

      const gameName = tropConf?.trophyconf?.title?.[0]?.['_'] || npCommId;
      const trophyDefs = tropConf?.trophyconf?.trophy || [];

      const unlockedTrophies = this.parseUserTrophyData(tropUsrPath);

      const trophies: RPCS3Trophy[] = trophyDefs.map((def: any, index: number) => {
        const trophyId = parseInt(def.$.id, 10);
        const isUnlocked = unlockedTrophies.has(trophyId);

        return {
          id: trophyId,
          name: def.name?.[0]?.['_'] || `Trophy ${trophyId}`,
          detail: def.detail?.[0]?.['_'] || '',
          type: (def.$.ttype || 'bronze').toLowerCase() as any,
          hidden: def.$.hidden === 'yes',
          unlocked: isUnlocked,
          unlockedAt: unlockedTrophies.get(trophyId)
        };
      });

      const stats = this.calculateTrophyStats(trophies);

      return {
        npCommId,
        gameName,
        trophies,
        ...stats
      };
    } catch (err) {
      console.error(`Failed to parse trophy set ${npCommId}:`, err);
      return null;
    }
  }

  private parseUserTrophyData(tropUsrPath: string): Map<number, Date> {
    const unlockedTrophies = new Map<number, Date>();

    if (!fs.existsSync(tropUsrPath)) {
      return unlockedTrophies;
    }

    try {
      const buffer = fs.readFileSync(tropUsrPath);
      
      let offset = 0x40;
      const entrySize = 0x30;
      
      while (offset + entrySize <= buffer.length) {
        const trophyId = buffer.readUInt32LE(offset + 0x04);
        
        const unlocked = buffer.readUInt8(offset + 0x08);
        
        const timestamp = Number(buffer.readBigUInt64LE(offset + 0x0C));
        
        if (unlocked && timestamp > 0) {
          unlockedTrophies.set(trophyId, new Date(timestamp * 1000));
        }
        
        offset += entrySize;
      }
    } catch (err) {
      console.error('Error parsing TROPUSR.DAT:', err);
    }

    return unlockedTrophies;
  }

  private calculateTrophyStats(trophies: RPCS3Trophy[]) {
    const stats = {
      totalTrophies: trophies.length,
      unlockedTrophies: trophies.filter(t => t.unlocked).length,
      bronze: { total: 0, unlocked: 0 },
      silver: { total: 0, unlocked: 0 },
      gold: { total: 0, unlocked: 0 },
      platinum: { total: 0, unlocked: 0 },
      completionPercent: 0
    };

    trophies.forEach(trophy => {
      const typeStats = stats[trophy.type];
      if (typeStats) {
        typeStats.total++;
        if (trophy.unlocked) {
          typeStats.unlocked++;
        }
      }
    });

    stats.completionPercent = stats.totalTrophies > 0
      ? Math.round((stats.unlockedTrophies / stats.totalTrophies) * 100)
      : 0;

    return stats;
  }

  async getTrophySetByNpCommId(npCommId: string): Promise<RPCS3TrophySet | null> {
    return this.parseTrophySet(npCommId);
  }

  getTrophyPath(): string {
    return this.trophyPath;
  }

  setTrophyPath(customPath: string) {
    this.trophyPath = customPath;
  }
}
import fs from 'fs';
import path from 'path';
import os from 'os';

interface RPCS3PlaytimeEntry {
  serial: string;
  titleId: string;
  gameName: string;
  playtimeSeconds: number;
  lastPlayed: Date;
}

export class RPCS3Service {
  private configPath: string;
  private gamesYmlPath: string;

  constructor(customConfigPath?: string) {
    const homeDir = os.homedir();

    if (customConfigPath) {
      this.configPath = customConfigPath;
    } else if (process.platform === 'linux') {
      this.configPath = path.join(homeDir, '.config', 'rpcs3');
    } else if (process.platform === 'win32') {
      this.configPath = path.join(homeDir, 'AppData', 'Roaming', 'rpcs3');
    } else if (process.platform === 'darwin') {
      this.configPath = path.join(homeDir, 'Library', 'Application Support', 'rpcs3');
    } else {
      this.configPath = path.join(homeDir, '.config', 'rpcs3');
    }

    this.gamesYmlPath = path.join(this.configPath, 'games.yml');
  }

  fileExists(): boolean {
    return fs.existsSync(this.gamesYmlPath);
  }

  parseGamesYml(): RPCS3PlaytimeEntry[] {
    if (!this.fileExists()) {
      throw new Error(`RPCS3 games.yml not found at: ${this.gamesYmlPath}`);
    }

    const content = fs.readFileSync(this.gamesYmlPath, 'utf8');
    const entries: RPCS3PlaytimeEntry[] = [];

    const lines = content.split('\n');
    
    let currentSerial: string | null = null;
    let currentTitle: string | null = null;
    let currentPlaytime: number | null = null;
    let currentLastPlayed: number | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      const serialMatch = line.match(/^["']?([A-Z]{4}\d{5})["']?:\s*$/);
      if (serialMatch) {
        if (currentSerial && currentTitle && currentPlaytime !== null) {
          entries.push({
            serial: currentSerial,
            titleId: currentSerial,
            gameName: currentTitle,
            playtimeSeconds: Math.floor(currentPlaytime / 1000),
            lastPlayed: currentLastPlayed 
              ? new Date(currentLastPlayed * 1000) 
              : new Date()
          });
        }

        currentSerial = serialMatch[1];
        currentTitle = null;
        currentPlaytime = null;
        currentLastPlayed = null;
        continue;
      }

      const titleMatch = line.match(/Title:\s*["']?(.+?)["']?\s*$/);
      if (titleMatch && currentSerial) {
        currentTitle = titleMatch[1];
      }

      const playtimeMatch = line.match(/PlayTime:\s*(\d+)/);
      if (playtimeMatch && currentSerial) {
        currentPlaytime = parseInt(playtimeMatch[1], 10);
      }

      const lastPlayedMatch = line.match(/LastPlayed:\s*(\d+)/);
      if (lastPlayedMatch && currentSerial) {
        currentLastPlayed = parseInt(lastPlayedMatch[1], 10);
      }
    }

    if (currentSerial && currentTitle && currentPlaytime !== null) {
      entries.push({
        serial: currentSerial,
        titleId: currentSerial,
        gameName: currentTitle,
        playtimeSeconds: Math.floor(currentPlaytime / 1000),
        lastPlayed: currentLastPlayed 
          ? new Date(currentLastPlayed * 1000) 
          : new Date()
      });
    }

    entries.forEach(e => {
      console.log(`📀 ${e.serial}: ${e.gameName} - ${Math.floor(e.playtimeSeconds / 60)}m`);
    });

    return entries;
  }

  getPlaytimeForSerial(serial: string): number | null {
    try {
      const entries = this.parseGamesYml();
      const entry = entries.find(e => e.serial === serial);
      return entry ? entry.playtimeSeconds : null;
    } catch (err) {
      console.error('Error getting playtime:', err);
      return null;
    }
  }

  getAllPlaytimes(): RPCS3PlaytimeEntry[] {
    return this.parseGamesYml();
  }

  setConfigPath(configPath: string) {
    this.configPath = configPath;
    this.gamesYmlPath = path.join(configPath, 'games.yml');
  }

  getConfigPath(): string {
    return this.configPath;
  }
}
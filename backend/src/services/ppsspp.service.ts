import fs from 'fs';
import path from 'path';
import os from 'os';

interface PPSSPPPlaytimeEntry {
  serial: string;
  gameName: string;
  playtimeSeconds: number;
  lastPlayed: Date;
}

export class PPSSPPService {
  private configPath: string;
  private ppssppIniPath: string;

  constructor(customConfigPath?: string) {
    const homeDir = os.homedir();
    
    if (customConfigPath) {
      this.configPath = customConfigPath;
    } else if (process.platform === 'linux') {
      this.configPath = path.join(homeDir, '.config', 'ppsspp');
    } else if (process.platform === 'win32') {
      this.configPath = path.join(homeDir, 'AppData', 'Roaming', 'ppsspp');
    } else if (process.platform === 'darwin') {
      this.configPath = path.join(homeDir, 'Library', 'Application Support', 'ppsspp');
    } else {
      this.configPath = path.join(homeDir, '.config', 'ppsspp');
    }

    this.ppssppIniPath = path.join(this.configPath, 'PSP', 'SYSTEM', 'ppsspp.ini');
  }

  fileExists(): boolean {
    return fs.existsSync(this.ppssppIniPath);
  }

  parsePlaytimes(): PPSSPPPlaytimeEntry[] {
    if (!this.fileExists()) {
      throw new Error(`PPSSPP config not found at: ${this.ppssppIniPath}`);
    }

    const content = fs.readFileSync(this.ppssppIniPath, 'utf8');
    const entries: PPSSPPPlaytimeEntry[] = [];

    const playTimeSection = content.match(/\[PlayTime\]([\s\S]*?)(?=\[|$)/);
    if (!playTimeSection) {
      console.log('⚠️ No [PlayTime] section found in ppsspp.ini');
      return entries;
    }

    const playTimeLines = playTimeSection[1].split('\n');
    
    for (const line of playTimeLines) {
      const match = line.match(/^([A-Z]{4}\d{5})\s*=\s*(\d+),(\d+)/);
      
      if (match) {
        const serial = match[1];
        const playtimeMinutes = parseInt(match[2]);
        const timestampNanos = match[3];
        
        const timestampMs = Math.floor(parseInt(timestampNanos) / 1000000);
        
        entries.push({
          serial,
          gameName: serial, 
          playtimeSeconds: playtimeMinutes * 60,
          lastPlayed: new Date(timestampMs)
        });

        console.log(`📀 ${serial}: ${playtimeMinutes} minutes`);
      }
    }

    console.log(`✅ Found ${entries.length} PSP games with playtime in ppsspp.ini`);
    return entries;
  }

  parseConfig(): PPSSPPPlaytimeEntry[] {
    if (!this.fileExists()) {
      throw new Error(`PPSSPP config not found at: ${this.ppssppIniPath}`);
    }

    const content = fs.readFileSync(this.ppssppIniPath, 'utf8');
    const entries: PPSSPPPlaytimeEntry[] = [];

    const recentSection = content.match(/\[Recent\]([\s\S]*?)(?=\[|$)/);
    if (!recentSection) {
      return entries;
    }

    const recentLines = recentSection[1].split('\n');
    
    for (const line of recentLines) {
      const fileMatch = line.match(/FileName\d+\s*=\s*(.+)/);
      if (fileMatch) {
        const filePath = fileMatch[1].trim();
        const fileName = path.basename(filePath);

        const serialMatch = fileName.match(/([A-Z]{4}\d{5})/);
        
        if (serialMatch) {
          const serial = serialMatch[1];
          
          entries.push({
            serial,
            gameName: fileName.replace(/\.(iso|cso|pbp)$/i, '').replace(/_/g, ' '),
            playtimeSeconds: 0, 
            lastPlayed: new Date()
          });
        }
      }
    }

    return entries;
  }

  getSaveDataGames(): PPSSPPPlaytimeEntry[] {
    const saveDataPath = path.join(this.configPath, 'PSP', 'SAVEDATA');
    
    if (!fs.existsSync(saveDataPath)) {
      return [];
    }

    const entries: PPSSPPPlaytimeEntry[] = [];
    const folders = fs.readdirSync(saveDataPath, { withFileTypes: true });

    for (const folder of folders) {
      if (folder.isDirectory()) {
        const serial = folder.name;
        
        if (/^[A-Z]{4}\d{5}$/.test(serial)) {
          const folderPath = path.join(saveDataPath, serial);
          const stats = fs.statSync(folderPath);
          
          entries.push({
            serial,
            gameName: serial,
            playtimeSeconds: 0,
            lastPlayed: stats.mtime
          });
        }
      }
    }

    console.log(`✅ Found ${entries.length} PSP games from save data`);
    return entries;
  }

  getRAData(): string | null {
    const raDataPath = path.join(this.configPath, 'PSP', 'SYSTEM', 'ppsspp_retroachievements.dat');
    
    if (!fs.existsSync(raDataPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(raDataPath, 'utf8');
      return content;
    } catch (err) {
      console.error('Error reading RA data:', err);
      return null;
    }
  }

  getAllGames(): PPSSPPPlaytimeEntry[] {
    const gameConfigPath = path.join(this.configPath, 'PSP', 'SYSTEM');
    
    if (!fs.existsSync(gameConfigPath)) {
      console.log('⚠️ PPSSPP config directory not found');
      return [];
    }

    const playtimeData = new Map<string, PPSSPPPlaytimeEntry>();
    try {
      const playtimes = this.parsePlaytimes();
      playtimes.forEach(pt => playtimeData.set(pt.serial, pt));
    } catch (err) {
      console.log('⚠️ Could not parse playtime data');
    }

    const entries: PPSSPPPlaytimeEntry[] = [];
    const files = fs.readdirSync(gameConfigPath);

    for (const file of files) {
      const match = file.match(/^([A-Z]{4}\d{5})_ppsspp\.ini$/);
      
      if (match) {
        const serial = match[1];
        const filePath = path.join(gameConfigPath, file);
        const stats = fs.statSync(filePath);

        const content = fs.readFileSync(filePath, 'utf8');
        const nameMatch = content.match(/# Game config for .+ - (.+)/);
        const gameName = nameMatch ? nameMatch[1].replace(/®|™/g, '').trim() : serial;
        
        const playtimeEntry = playtimeData.get(serial);
        const playtimeSeconds = playtimeEntry ? playtimeEntry.playtimeSeconds : 0;
        const lastPlayed = playtimeEntry ? playtimeEntry.lastPlayed : stats.mtime;
        
        entries.push({
          serial,
          gameName,
          playtimeSeconds,
          lastPlayed
        });
      }
    }

    entries.forEach(e => {
      const minutes = Math.round(e.playtimeSeconds / 60);
    });

    return entries;
  }

  setConfigPath(configPath: string) {
    this.configPath = configPath;
    this.ppssppIniPath = path.join(configPath, 'PSP', 'SYSTEM', 'ppsspp.ini');
  }

  getConfigPath(): string {
    return this.configPath;
  }
}
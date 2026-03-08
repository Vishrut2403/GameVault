import axios from 'axios';

const RA_API_BASE = 'https://retroachievements.org/API';

interface RAUserSummary {
  id: number;
  username: string;
  totalPoints: number;
  totalTruePoints: number;
  totalRanked: number;
  lastActivity: {
    id: number;
    timestamp: string;
    activityType: number;
    data: string;
  };
  richPresenceMsg: string;
  recentlyPlayedCount: number;
  memberSince: string;
  lastGameId: number;
  contribCount: number;
  contribYield: number;
  totalAwarded: number;
  permissions: number;
  untracked: number;
  motto: string;
}

interface RAUserProgress {
  gameId: number;
  title: string;
  consoleId: number;
  consoleName: string;
  imageIcon: string;
  numPossibleAchievements: number;
  possibleScore: number;
  numAchieved: number;
  scoreAchieved: number;
  numAchievedHardcore: number;
  scoreAchievedHardcore: number;
  mostRecentAchievementId?: number;
  lastPlayed?: string;
}

interface RAGameInfo {
  id: number;
  title: string;
  consoleId: number;
  consoleName: string;
  forumTopicId: number;
  flags: number;
  imageIcon: string;
  imageTitle: string;
  imageIngame: string;
  imageBoxArt: string;
  publisher: string;
  developer: string;
  genre: string;
  released: string;
  isFinal: boolean;
  richPresencePatch: string;
  numAchievements: number;
  numDistinctPlayersCasual: number;
  numDistinctPlayersHardcore: number;
  achievements: Record<string, RAAchievement>;
}

interface RAAchievement {
  id: number;
  numAwarded: number;
  numAwardedHardcore: number;
  title: string;
  description: string;
  points: number;
  trueRatio: number;
  author: string;
  dateModified: string;
  dateCreated: string;
  badgeName: string;
  displayOrder: number;
  memAddr: string;
  type: string | null;
}

interface RAUserAchievements {
  gameId: number;
  hardcoreMode: boolean;
  achievements: Record<string, {
    achievementId: number;
    dateEarned: string;
    hardcoreMode: boolean;
  }>;
}

interface RAConsole {
  id: number;
  name: string;
}

export class RetroAchievementsService {
  private apiKey: string;
  private username: string;

  constructor(username?: string, apiKey?: string) {
    this.username = username || process.env.RA_USERNAME || '';
    this.apiKey = apiKey || process.env.RA_API_KEY || '';
  }

  setCredentials(username: string, apiKey: string) {
    this.username = username;
    this.apiKey = apiKey;
  }

  private validateCredentials() {
    if (!this.username || !this.apiKey) {
      throw new Error('RetroAchievements credentials not configured. Please set RA_USERNAME and RA_API_KEY.');
    }
  }

  private buildUrl(endpoint: string, params: Record<string, any> = {}): string {
    const url = new URL(`${RA_API_BASE}/${endpoint}`);
    url.searchParams.append('z', this.username);
    url.searchParams.append('y', this.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    
    return url.toString();
  }

  async getUserSummary(targetUsername?: string): Promise<RAUserSummary> {
    this.validateCredentials();
    const user = targetUsername || this.username;
    
    const url = this.buildUrl('API_GetUserSummary.php', { u: user });
    const response = await axios.get(url);
    
    return response.data;
  }

  async getUserProgress(targetUsername?: string): Promise<RAUserProgress[]> {
    this.validateCredentials();
    const user = targetUsername || this.username;

    const url = this.buildUrl('API_GetUserRecentlyPlayedGames.php', { 
      u: user,
      c: 100 
    });
    const response = await axios.get(url);

    const gamesData = response.data;
    
    if (!Array.isArray(gamesData)) {
      return [];
    }
    
    return gamesData.map((game: any) => ({
      gameId: game.GameID,
      title: game.Title,
      consoleId: game.ConsoleID,
      consoleName: game.ConsoleName,
      imageIcon: game.ImageIcon,
      numPossibleAchievements: game.AchievementsTotal || game.NumPossibleAchievements,
      possibleScore: game.PossibleScore,
      numAchieved: game.NumAchieved,
      scoreAchieved: game.ScoreAchieved,
      numAchievedHardcore: game.NumAchievedHardcore,
      scoreAchievedHardcore: game.ScoreAchievedHardcore,
      lastPlayed: game.LastPlayed
    }));
  }

  async getGameInfo(gameId: number): Promise<any> {
    this.validateCredentials();
    
    const url = this.buildUrl('API_GetGame.php', { i: gameId });
    const response = await axios.get(url);
    
    return response.data;
  }

  async getGameInfoExtended(gameId: number): Promise<any> {
    this.validateCredentials();
    
    const url = this.buildUrl('API_GetGameExtended.php', { i: gameId });
    const response = await axios.get(url);

    return response.data;
  }

  async getUserGameAchievements(
    targetUsername: string, 
    gameId: number
  ): Promise<RAUserAchievements> {
    this.validateCredentials();
    
    const url = this.buildUrl('API_GetUserProgress.php', { 
      u: targetUsername,
      i: gameId 
    });
    const response = await axios.get(url);
    
    return response.data;
  }

  async getConsoles(): Promise<RAConsole[]> {
    this.validateCredentials();
    
    const url = this.buildUrl('API_GetConsoleIDs.php');
    const response = await axios.get(url);
    
    return response.data;
  }

  async getUserRecentlyPlayed(targetUsername?: string, count: number = 10): Promise<any[]> {
    this.validateCredentials();
    const user = targetUsername || this.username;
    
    const url = this.buildUrl('API_GetUserRecentlyPlayedGames.php', { 
      u: user,
      c: count 
    });
    const response = await axios.get(url);
    
    return response.data || [];
  }

  getAchievementIconUrl(badgeName: string, locked: boolean = false): string {
    return `https://media.retroachievements.org/Badge/${badgeName}${locked ? '_lock' : ''}.png`;
  }

  getGameIconUrl(iconPath: string): string {
    return `https://media.retroachievements.org${iconPath}`;
  }

  getGameBoxArtUrl(boxArtPath: string): string {
    return `https://media.retroachievements.org${boxArtPath}`;
  }

  calculateCompletion(numAchieved: number, numPossible: number): number {
    if (numPossible === 0) return 0;
    return Math.round((numAchieved / numPossible) * 100);
  }

  isMastered(numAchieved: number, numPossible: number): boolean {
    return numAchieved === numPossible && numPossible > 0;
  }

  getConsoleDisplayName(consoleId: number, consoleName: string): string {
    const consoleMap: Record<number, string> = {
      1: 'Genesis/Mega Drive',
      2: 'Nintendo 64',
      3: 'SNES',
      4: 'Game Boy',
      5: 'Game Boy Advance',
      6: 'Game Boy Color',
      7: 'NES',
      8: 'PC Engine',
      9: 'Sega CD',
      10: 'Sega 32X',
      11: 'Master System',
      12: 'PlayStation',
      13: 'Atari Lynx',
      14: 'Neo Geo Pocket',
      15: 'Game Gear',
      17: 'Atari Jaguar',
      18: 'Nintendo DS',
      21: 'PlayStation 2',
      23: 'Magnavox Odyssey 2',
      24: 'Pokemon Mini',
      25: 'Atari 2600',
      27: 'Arcade',
      28: 'Virtual Boy',
      29: 'MSX',
      33: 'SG-1000',
      38: 'Apple II',
      39: 'Sega Saturn',
      40: 'Dreamcast',
      41: 'PlayStation Portable',
      43: '3DO',
      44: 'ColecoVision',
      45: 'Intellivision',
      46: 'Vectrex',
      47: 'PC-8000/8800',
      49: 'PC-FX',
      51: 'Atari 7800',
      53: 'WonderSwan',
      63: 'Watara Supervision',
      69: 'Mega Duck',
      71: 'Arduboy',
      72: 'WASM-4',
      73: 'Arcadia 2001',
      74: 'Interton VC 4000',
      75: 'Elektor TV Games Computer',
      76: 'PC Engine CD',
      77: 'Atari Jaguar CD',
      78: 'Nintendo DSi',
      80: 'Uzebox'
    };
    
    return consoleMap[consoleId] || consoleName;
  }

  async syncUserLibrary(targetUsername?: string): Promise<{
    summary: RAUserSummary;
    games: RAUserProgress[];
  }> {
    this.validateCredentials();
    const user = targetUsername || this.username;
    
    const [summary, games] = await Promise.all([
      this.getUserSummary(user),
      this.getUserProgress(user)
    ]);
    
    return { summary, games };
  }
}

// Export singleton instance
export const retroAchievementsService = new RetroAchievementsService();
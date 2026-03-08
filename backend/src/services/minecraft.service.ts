import fs from 'fs';
import path from 'path';
import { parse as parseIni } from 'ini';
import AdmZip from 'adm-zip';

interface MinecraftInstance {
  name: string;
  path: string;
  lastPlayed: Date | null;
  worlds: MinecraftWorld[];
}

interface MinecraftWorld {
  name: string;
  path: string;
  playtime: number;
  instanceName: string;
}

interface MinecraftStats {
  playtime: number;
  achievements: any;
  rawStats: any;
}

export class MinecraftService {
  private prismLauncherPath: string;

  constructor() {
    this.prismLauncherPath = path.join(
      process.env.HOME || '',
      '.local/share/PrismLauncher/instances'
    );

    if (process.env.PRISM_LAUNCHER_PATH) {
      this.prismLauncherPath = process.env.PRISM_LAUNCHER_PATH;
    }
  }

  async getInstances(): Promise<MinecraftInstance[]> {
    try {
      if (!fs.existsSync(this.prismLauncherPath)) {
        return [];
      }

      const instanceDirs = fs.readdirSync(this.prismLauncherPath);
      const instances: MinecraftInstance[] = [];

      for (const dir of instanceDirs) {
        const instancePath = path.join(this.prismLauncherPath, dir);

        if (!fs.statSync(instancePath).isDirectory()) {
          continue;
        }

        const configPath = path.join(instancePath, 'instance.cfg');

        if (fs.existsSync(configPath)) {
          try {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const config = parseIni(configContent);
            
            const lastPlayedTime = config.General?.lastLaunchTime 
              ? new Date(parseInt(config.General.lastLaunchTime))
              : null;

            const worlds = await this.getWorldsForInstance(instancePath, dir);

            instances.push({
              name: config.General?.name || dir,
              path: instancePath,
              lastPlayed: lastPlayedTime,
              worlds,
            });
          } catch (err) {
            console.error(`Failed to parse instance ${dir}:`, err);
          }
        }
      }

      return instances;
    } catch (err) {
      console.error('Failed to read Prism instances:', err);
      return [];
    }
  }

  private async getWorldsForInstance(instancePath: string, instanceName: string): Promise<MinecraftWorld[]> {
    let savesPath = path.join(instancePath, '.minecraft', 'saves');

    if (!fs.existsSync(savesPath)) {
      savesPath = path.join(instancePath, 'minecraft', 'saves');
    }
    
    if (!fs.existsSync(savesPath)) {
      return [];
    }

    try {
      const worldDirs = fs.readdirSync(savesPath);
      const worlds: MinecraftWorld[] = [];

      for (const worldDir of worldDirs) {
        const worldPath = path.join(savesPath, worldDir);
        
        if (!fs.statSync(worldPath).isDirectory()) {
          continue;
        }

        try {
          const stats = await this.getWorldStats(worldPath);

          worlds.push({
            name: worldDir,
            path: worldPath,
            playtime: stats.playtime,
            instanceName,
          });
        } catch (err) {
          console.error(`Failed to get stats for world ${worldDir}:`, err);
        }
      }

      return worlds;
    } catch (err) {
      console.error('Failed to read worlds:', err);
      return [];
    }
  }

  private getTotalAdvancementsFromDatapacks(worldPath: string): number {
    try {
      const datapacksPath = path.join(worldPath, 'datapacks');
      
      if (!fs.existsSync(datapacksPath)) {
        return 0;
      }

      let totalCount = 0;

      const datapacks = fs.readdirSync(datapacksPath);
      
      for (const datapack of datapacks) {
        const datapackPath = path.join(datapacksPath, datapack);
        
        if (datapack.endsWith('.zip')) {
          try {
            const zip = new AdmZip(datapackPath);
            const zipEntries = zip.getEntries();
            
            let zipAdvCount = 0;
            
            for (const entry of zipEntries) {
              const entryPath = entry.entryName;
              
              if (entry.isDirectory || !entryPath.endsWith('.json')) continue;
              
              if (entryPath.includes('/recipes/')) continue;
              
              if (entryPath.includes('/advancements/') || entryPath.includes('/advancement/')) {
                zipAdvCount++;
              }
            }
            
            totalCount += zipAdvCount;
            continue;
          } catch (zipErr) {
            console.error(`Failed to read ZIP ${datapack}:`, zipErr);
            continue;
          }
        }
        
        if (!fs.statSync(datapackPath).isDirectory()) continue;

        const dataPath = path.join(datapackPath, 'data');
        
        if (!fs.existsSync(dataPath)) continue;

        const namespaces = fs.readdirSync(dataPath);
        
        for (const namespace of namespaces) {
          let advancementsPath = path.join(dataPath, namespace, 'advancements');
          
          if (!fs.existsSync(advancementsPath)) {
            advancementsPath = path.join(dataPath, namespace, 'advancement');
          }
          
          if (!fs.existsSync(advancementsPath)) continue;

          const count = this.countAdvancementFiles(advancementsPath);
          totalCount += count;
          
        }
      }

      return totalCount;
    } catch (err) {
      console.error('Failed to scan datapacks:', err);
      return 0;
    }
  }

  private countAdvancementFiles(dir: string): number {
    let count = 0;

    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (item === 'recipes') continue;
          
          count += this.countAdvancementFiles(fullPath);
        } else if (item.endsWith('.json')) {
          count++;
        }
      }
    } catch (err) {
      // Ignore errors
    }

    return count;
  }

  private async getWorldStats(worldPath: string): Promise<MinecraftStats> {
    try {
      const statsPath = path.join(worldPath, 'stats');
      
      if (!fs.existsSync(statsPath)) {
        return { playtime: 0, achievements: { stats: {}, achievements: {} }, rawStats: {} };
      }

      const statsFiles = fs.readdirSync(statsPath).filter(f => f.endsWith('.json'));
      
      if (statsFiles.length === 0) {
        return { playtime: 0, achievements: { stats: {}, achievements: {} }, rawStats: {} };
      }

      const statsFile = path.join(statsPath, statsFiles[0]);
      const statsData = JSON.parse(fs.readFileSync(statsFile, 'utf-8'));

      const playTimeTicks = statsData.stats?.['minecraft:custom']?.['minecraft:play_time'] || 0;
      const playtimeMinutes = Math.floor((playTimeTicks / 20) / 60);

      const playerUUID = statsFiles[0].replace('.json', '');
      const advancementsPath = path.join(worldPath, 'advancements', `${playerUUID}.json`);
      
      let totalAdvancements = 0;
      let completedAdvancements = 0;

      if (fs.existsSync(advancementsPath)) {
        try {
          const advancementsData = JSON.parse(fs.readFileSync(advancementsPath, 'utf-8'));

          const allKeys = Object.keys(advancementsData);

          const realAdvancements = allKeys.filter(key => {

            if (key === 'DataVersion') return false;

            if (key.includes('/recipes/') || key.startsWith('minecraft:recipes/')) return false;
            
            const entry = advancementsData[key];
            if (typeof entry !== 'object' || !entry.criteria) return false;
            
            const criteriaKeys = Object.keys(entry.criteria || {});

            const isRecipeUnlock = criteriaKeys.some(k => 
              k === 'has_the_recipe' ||
              k === 'unlock_right_away' ||
              k.startsWith('has_') 
            ) && criteriaKeys.length === 1;
            
            if (isRecipeUnlock) return false;

            if (key.toLowerCase().includes('recipe')) return false;
            
            return true;
          });

          const namespaces: Record<string, number> = {};
          const namespaceCompleted: Record<string, number> = {};
          
          realAdvancements.forEach(key => {
            const namespace = key.split(':')[0];
            namespaces[namespace] = (namespaces[namespace] || 0) + 1;
            
            if (advancementsData[key].done === true) {
              namespaceCompleted[namespace] = (namespaceCompleted[namespace] || 0) + 1;
            }
          });
          
          totalAdvancements = realAdvancements.length;
          
          completedAdvancements = realAdvancements.filter(key => {
            const advancement = advancementsData[key];
            return advancement.done === true;
          }).length;
          
        } catch (err) {
          console.error('Failed to parse advancements:', err);
        }
      } else {
        console.log('Advancements file not found:', advancementsPath);
      }

      const datapackTotal = this.getTotalAdvancementsFromDatapacks(worldPath);
      
      const vanillaAdvancementCount = 122; 
      
      if (datapackTotal > 0) {
        totalAdvancements = datapackTotal + vanillaAdvancementCount;
      }

      const achievements = this.parseAchievements(statsData);

      return {
        playtime: playtimeMinutes,
        achievements: {
          stats: achievements.stats,
          achievements: {
            totalAdvancements,
            completedAdvancements,
          },
        },
        rawStats: statsData.stats?.['minecraft:custom'] || {},
      };
    } catch (err) {
      console.error('Failed to read world stats:', err);
      return { playtime: 0, achievements: { stats: {}, achievements: {} }, rawStats: {} };
    }
  }

  private parseAchievements(statsData: any): any {
    const customStats = statsData.stats?.['minecraft:custom'] || {};
    
    const diamondsMined = customStats['minecraft:mine_diamond'] || 0;
    const deaths = customStats['minecraft:deaths'] || 0;
    const mobKills = customStats['minecraft:mob_kills'] || 0;
    const distanceWalked = customStats['minecraft:walk_one_cm'] || 0;
    const jumps = customStats['minecraft:jump'] || 0;
    const timeSinceDeath = customStats['minecraft:time_since_death'] || 0;

    return {
      stats: {
        diamondsMined,
        deaths,
        mobKills,
        distanceWalked,
        jumps,
        timeSinceDeath,
      },
      achievements: {
        first_diamond: diamondsMined > 0,
        diamond_millionaire: diamondsMined >= 1000,
        explorer: distanceWalked > 100000000, 
        survivor: deaths < 10,
        warrior: mobKills > 1000,
        jumpy: jumps > 10000,
      },
    };
  }

  async syncMinecraftData(
    userId: string,
    worldPath: string,
    worldName: string,
    instanceName?: string
  ) {
    const stats = await this.getWorldStats(worldPath);

    const totalAchievements = stats.achievements.achievements.totalAdvancements || 0;
    const completedAchievements = stats.achievements.achievements.completedAdvancements || 0;
    const achievementPercentage = totalAchievements > 0 
      ? (completedAchievements / totalAchievements) * 100 
      : 0;
    const platformGameId = `minecraft_${Buffer.from(worldPath).toString('base64').substring(0, 32)}`;

    const iconPath = path.join(worldPath, 'icon.png');
    let headerImage = null;

    if (fs.existsSync(iconPath)) {
      try {
        const iconBuffer = fs.readFileSync(iconPath);
        headerImage = `data:image/png;base64,${iconBuffer.toString('base64')}`;
      } catch (err) {
        console.log('Failed to read world icon:', err);
      }
    }

    return {
      userId,
      platform: 'minecraft',
      platformGameId,
      name: `Minecraft - ${worldName}`,
      playtimeForever: stats.playtime,
      headerImage,
      totalAchievements,
      completedAchievements,
      achievementPercentage: Math.round(achievementPercentage),
      minecraftWorldName: worldName,
      minecraftWorldPath: worldPath,
      minecraftInstanceName: instanceName || null,
      minecraftStats: stats.rawStats,
      platformData: {
        ...stats.achievements.stats,
        advancements: stats.achievements.achievements,
      },
    };
  }
}
import { PrismaClient } from '@prisma/client';
import steamService from './steam.service';
import { PCSX2Service } from './pcsx2.service';
import { PPSSPPService } from './ppsspp.service';
import { RPCS3Service } from './rpcs3.service';
import retroarchService from './retroarch.service';
import { sessionTrackingService } from './session-tracking.service';

const prisma = new PrismaClient();

export class AutoSyncService {
  private lastSyncTime: Map<string, number> = new Map();
  private readonly SYNC_COOLDOWN_MS = 30000; // 30 seconds between syncs
  private pcsx2Service: PCSX2Service;
  private ppssppService: PPSSPPService;
  private rpcs3Service: RPCS3Service;

  constructor() {
    this.pcsx2Service = new PCSX2Service();
    this.ppssppService = new PPSSPPService();
    this.rpcs3Service = new RPCS3Service();
  }

  async triggerAutoSync(userId: string): Promise<void> {
    try {
      // Check cooldown to avoid spam
      const lastSync = this.lastSyncTime.get(userId) || 0;
      const timeSinceLastSync = Date.now() - lastSync;
      
      if (timeSinceLastSync < this.SYNC_COOLDOWN_MS) {
        console.log(`Auto-sync cooldown active for user ${userId} (${(this.SYNC_COOLDOWN_MS - timeSinceLastSync) / 1000}s remaining)`);
        return;
      }

      this.lastSyncTime.set(userId, Date.now());

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        console.warn(`User ${userId} not found for auto-sync`);
        return;
      }

      console.log(`Starting auto-sync for user ${userId}...`);

      // Sync Steam library
      if (user.steamId) {
        try {
          console.log(`Syncing Steam library...`);
          const library = await steamService.getUserLibrary(user.steamId);
          
          for (const steamGame of library) {
            try {
              const existingGame = await prisma.libraryGame.findUnique({
                where: {
                  userId_platformGameId_platform: {
                    userId,
                    platformGameId: String(steamGame.appid),
                    platform: 'steam'
                  }
                }
              });

              const newPlaytime = steamGame.playtime_forever || 0;

              if (existingGame && newPlaytime > 0) {
                const oldPlaytime = existingGame.playtimeForever || 0;
                
                if (newPlaytime > oldPlaytime) {
                  await sessionTrackingService.trackSession({
                    userId,
                    gameId: existingGame.id,
                    platform: 'steam',
                    newPlaytimeMinutes: newPlaytime,
                    oldPlaytimeMinutes: oldPlaytime,
                  });
                }
              }

              await prisma.libraryGame.upsert({
                where: {
                  userId_platformGameId_platform: {
                    userId,
                    platformGameId: String(steamGame.appid),
                    platform: 'steam'
                  }
                },
                create: {
                  userId,
                  platformGameId: String(steamGame.appid),
                  platform: 'steam',
                  name: steamGame.name,
                  imageUrl: `https://media.steampowered.com/steamcommunity/public/images/apps/${steamGame.appid}/${steamGame.img_logo_url}.jpg`,
                  playtimeForever: steamGame.playtime_forever || 0,
                },
                update: {
                  playtimeForever: steamGame.playtime_forever || 0,
                }
              });
            } catch (err: any) {
              console.warn(`Failed to sync game ${steamGame.appid}:`, err?.message);
            }
          }
          console.log(`Steam library synced`);
        } catch (err: any) {
          console.error(`Failed to sync Steam:`, err?.message);
        }
      }

      // Sync emulators in parallel
      const emulatorsToSync = [];

      if (user.enablePCSX2) {
        emulatorsToSync.push(
          this.syncPCSX2(userId)
            .then(() => console.log(`PCSX2 synced`))
            .catch((err: any) => console.error(`PCSX2 sync failed:`, err?.message))
        );
      }

      if (user.enablePPSSPP) {
        emulatorsToSync.push(
          this.syncPPSSPP(userId)
            .then(() => console.log(`PPSSPP synced`))
            .catch((err: any) => console.error(`PPSSPP sync failed:`, err?.message))
        );
      }

      if (user.enableRPCS3) {
        emulatorsToSync.push(
          this.syncRPCS3(userId)
            .then(() => console.log(`RPCS3 synced`))
            .catch((err: any) => console.error(`RPCS3 sync failed:`, err?.message))
        );
      }

      if (user.enableRetroArch) {
        emulatorsToSync.push(
          this.syncRetroArch(userId)
            .then(() => console.log(`RetroArch synced`))
            .catch((err: any) => console.error(`RetroArch sync failed:`, err?.message))
        );
      }

      if (emulatorsToSync.length > 0) {
        await Promise.all(emulatorsToSync);
      }

      console.log(`Auto-sync completed for user ${userId}`);
    } catch (error: any) {
      console.error(`Auto-sync failed for user ${userId}:`, error?.message);
    }
  }

  private async syncPCSX2(userId: string): Promise<void> {
    // Implementation will be added via API route call
    const response = await fetch('http://localhost:3001/api/pcsx2/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!response.ok) throw new Error(`PCSX2 sync failed: ${response.statusText}`);
  }

  private async syncPPSSPP(userId: string): Promise<void> {
    const response = await fetch('http://localhost:3001/api/ppsspp/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!response.ok) throw new Error(`PPSSPP sync failed: ${response.statusText}`);
  }

  private async syncRPCS3(userId: string): Promise<void> {
    const response = await fetch('http://localhost:3001/api/rpcs3/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!response.ok) throw new Error(`RPCS3 sync failed: ${response.statusText}`);
  }

  private async syncRetroArch(userId: string): Promise<void> {
    const response = await fetch('http://localhost:3001/api/retroarch/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!response.ok) throw new Error(`RetroArch sync failed: ${response.statusText}`);
  }

  getLastSyncTime(userId: string): Date | null {
    const timestamp = this.lastSyncTime.get(userId);
    return timestamp ? new Date(timestamp) : null;
  }

  resetCooldown(userId: string): void {
    this.lastSyncTime.delete(userId);
    console.log(`Cooldown reset for user ${userId}`);
  }
}

export const autoSyncService = new AutoSyncService();

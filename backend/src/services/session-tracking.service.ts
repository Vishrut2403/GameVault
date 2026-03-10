import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SessionTrackingService {
  
  async trackSession(params: {
    userId: string;
    gameId: string;
    platform: string;
    newPlaytimeMinutes: number;
    oldPlaytimeMinutes: number;
    sessionDate?: Date;
  }): Promise<void> {
    const { userId, gameId, platform, newPlaytimeMinutes, oldPlaytimeMinutes, sessionDate } = params;
    
    const deltaMinutes = newPlaytimeMinutes - oldPlaytimeMinutes;
    
    if (deltaMinutes <= 0) {
      return;
    }

    const date = sessionDate ? new Date(sessionDate) : new Date();
    date.setUTCHours(0, 0, 0, 0);

    await prisma.gameSession.upsert({
      where: {
        userId_gameId_date: {
          userId,
          gameId,
          date
        }
      },
      create: {
        userId,
        gameId,
        platform,
        date,
        minutes: deltaMinutes
      },
      update: {
        minutes: {
          increment: deltaMinutes
        }
      }
    });
    
    await prisma.libraryGame.update({
      where: { id: gameId },
      data: {
        lastPlayedAt: sessionDate || new Date()
      }
    });
  }
  
  async getUserSessions(userId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    gameId?: string;
    platform?: string;
  }) {
    const where: any = { userId };
    
    if (options?.startDate || options?.endDate) {
      where.date = {};
      if (options.startDate) where.date.gte = options.startDate;
      if (options.endDate) where.date.lte = options.endDate;
    }
    
    if (options?.gameId) {
      where.gameId = options.gameId;
    }
    
    if (options?.platform) {
      where.platform = options.platform;
    }
    
    return await prisma.gameSession.findMany({
      where,
      include: {
        game: {
          select: {
            name: true,
            platform: true,
            headerImage: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });
  }

  async getDailyActivity(userId: string, days: number = 365) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);
    
    const sessions = await prisma.gameSession.findMany({
      where: {
        userId,
        date: {
          gte: startDate
        }
      },
      include: {
        game: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    const activityMap = new Map<string, {
      date: string;
      hours: number;
      games: string[];
      count: number;
    }>();
    
    sessions.forEach(session => {
      const dateStr = session.date.toISOString().split('T')[0];
      const existing = activityMap.get(dateStr);
      
      if (existing) {
        existing.hours += session.minutes / 60;
        existing.games.push(session.game.name);
        existing.count++;
      } else {
        activityMap.set(dateStr, {
          date: dateStr,
          hours: session.minutes / 60,
          games: [session.game.name],
          count: 1
        });
      }
    });
    
    return Array.from(activityMap.values());
  }
  
  async getTotalPlaytime(userId: string, startDate: Date, endDate: Date) {
    const result = await prisma.gameSession.aggregate({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        minutes: true
      }
    });
    
    return result._sum.minutes || 0;
  }
}

export const sessionTrackingService = new SessionTrackingService();   
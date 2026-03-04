-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('STEAM', 'APPLE', 'PRISM', 'PCSX2', 'PPSSPP', 'RPCS3');

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "platformGameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "playtimeForever" INTEGER NOT NULL DEFAULT 0,
    "pricePaid" DOUBLE PRECISION,
    "pricePerHour" DOUBLE PRECISION,
    "genres" TEXT[],
    "userTags" TEXT[],
    "status" TEXT DEFAULT 'unplayed',
    "rating" INTEGER,
    "tier" TEXT,
    "review" TEXT,
    "imgIconUrl" TEXT,
    "imgLogoUrl" TEXT,
    "headerImage" TEXT,
    "totalAchievements" INTEGER DEFAULT 0,
    "completedAchievements" INTEGER DEFAULT 0,
    "achievementPercentage" DOUBLE PRECISION DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "lastPlayedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "play_sessions" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,

    CONSTRAINT "play_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" TIMESTAMP(3),

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "games_userId_idx" ON "games"("userId");

-- CreateIndex
CREATE INDEX "games_platform_idx" ON "games"("platform");

-- CreateIndex
CREATE INDEX "games_status_idx" ON "games"("status");

-- CreateIndex
CREATE INDEX "games_tier_idx" ON "games"("tier");

-- CreateIndex
CREATE INDEX "games_rating_idx" ON "games"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "games_userId_platform_platformGameId_key" ON "games"("userId", "platform", "platformGameId");

-- CreateIndex
CREATE INDEX "play_sessions_gameId_idx" ON "play_sessions"("gameId");

-- CreateIndex
CREATE INDEX "achievements_gameId_idx" ON "achievements"("gameId");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

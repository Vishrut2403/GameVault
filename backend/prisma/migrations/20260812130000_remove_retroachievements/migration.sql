-- Remove RetroAchievements integration.
-- Any library rows for the removed platform go with it.

DELETE FROM "library_games" WHERE "platform" = 'retroachievements';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "raUsername",
DROP COLUMN "raApiKey",
DROP COLUMN "raLinkedAt",
DROP COLUMN "autoSyncRA";

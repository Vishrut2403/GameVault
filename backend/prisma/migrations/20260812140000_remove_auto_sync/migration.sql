-- Remove the auto-sync feature. The Sync Steam button covers the same work,
-- including session tracking, so the per-user auto-sync preference is unused.

-- AlterTable
ALTER TABLE "users" DROP COLUMN "autoSyncSteam";

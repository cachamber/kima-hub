-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN "soulseekEnabled" BOOLEAN,
ADD COLUMN "soulseekDownloadPath" TEXT,
ADD COLUMN "lastfmApiSecret" TEXT,
ADD COLUMN "lastfmUserKey" TEXT,
ADD COLUMN "lastfmEnabled" BOOLEAN;

-- Auto-enable Soulseek for existing installations with credentials
UPDATE "SystemSettings" SET "soulseekEnabled" = true WHERE "soulseekUsername" IS NOT NULL AND "soulseekUsername" != '';

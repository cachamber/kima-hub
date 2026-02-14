-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN "soulseekEnabled" BOOLEAN,
ADD COLUMN "soulseekDownloadPath" TEXT,
ADD COLUMN "lastfmApiSecret" TEXT,
ADD COLUMN "lastfmUserKey" TEXT,
ADD COLUMN "lastfmEnabled" BOOLEAN;

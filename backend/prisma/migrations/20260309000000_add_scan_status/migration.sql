-- AlterTable
ALTER TABLE "Track" ADD COLUMN "scanStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "scanError" TEXT;

-- CreateIndex
CREATE INDEX "Track_scanStatus_idx" ON "Track"("scanStatus");

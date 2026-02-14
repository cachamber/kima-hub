-- Drop the old global targetMbid constraint (doesn't account for multi-user or batch context)
DROP INDEX IF EXISTS "DownloadJob_targetMbid_active_unique";

-- Add user+batch-scoped unique constraint to prevent duplicate download jobs
-- Partial index ensures uniqueness only for active jobs (pending or downloading)
-- This allows retrying failed jobs without constraint violations
-- Scoped by userId and discoveryBatchId to allow:
--   - Different users downloading the same album
--   - Same user downloading same album in different batches
CREATE UNIQUE INDEX "DownloadJob_userId_targetMbid_discoveryBatchId_key"
  ON "DownloadJob"("userId", "targetMbid", "discoveryBatchId")
  WHERE "status" IN ('pending', 'downloading');

-- AlterTable
ALTER TABLE "ScanJob" ADD COLUMN "parameters" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Asset_projectId_target_key" ON "Asset"("projectId", "target");

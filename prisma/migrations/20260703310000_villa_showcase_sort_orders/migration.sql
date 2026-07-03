-- AlterTable
ALTER TABLE "Villa"
ADD COLUMN "dealSortOrder" INTEGER NOT NULL DEFAULT 99,
ADD COLUMN "popularSortOrder" INTEGER NOT NULL DEFAULT 99,
ADD COLUMN "recommendedSortOrder" INTEGER NOT NULL DEFAULT 99;

UPDATE "Villa"
SET
  "dealSortOrder" = "sortOrder",
  "popularSortOrder" = "sortOrder",
  "recommendedSortOrder" = "sortOrder";

DROP INDEX IF EXISTS "Villa_sortOrder_idx";

ALTER TABLE "Villa" DROP COLUMN "sortOrder";

-- CreateIndex
CREATE INDEX "Villa_dealSortOrder_idx" ON "Villa"("dealSortOrder");
CREATE INDEX "Villa_popularSortOrder_idx" ON "Villa"("popularSortOrder");
CREATE INDEX "Villa_recommendedSortOrder_idx" ON "Villa"("recommendedSortOrder");

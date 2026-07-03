-- AlterTable
ALTER TABLE "Region" ADD COLUMN "parentId" TEXT;
ALTER TABLE "Region" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Region" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Region" ADD COLUMN "showInSearch" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Region" ADD COLUMN "showInOffer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Region" ADD COLUMN "showOnHome" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Region" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Update existing rows
UPDATE "Region" SET "active" = true, "published" = true;

-- CreateIndex
CREATE INDEX "Region_parentId_idx" ON "Region"("parentId");
CREATE INDEX "Region_active_idx" ON "Region"("active");

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Villa" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Villa" ADD COLUMN "documentNo" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Villa_active_idx" ON "Villa"("active");

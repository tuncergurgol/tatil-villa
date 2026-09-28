-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "blacklisted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Customer_blacklisted_idx" ON "Customer"("blacklisted");

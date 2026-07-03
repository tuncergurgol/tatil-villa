-- CreateEnum
CREATE TYPE "PriceInclusionType" AS ENUM ('INCLUDED', 'EXCLUDED');

-- CreateTable
CREATE TABLE "PriceInclusionItem" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "PriceInclusionType" NOT NULL DEFAULT 'INCLUDED',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceInclusionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceInclusionItem_type_idx" ON "PriceInclusionItem"("type");

-- CreateIndex
CREATE INDEX "PriceInclusionItem_isDefault_idx" ON "PriceInclusionItem"("isDefault");

-- CreateIndex
CREATE INDEX "PriceInclusionItem_sortOrder_idx" ON "PriceInclusionItem"("sortOrder");

-- CreateIndex
CREATE INDEX "PriceInclusionItem_active_idx" ON "PriceInclusionItem"("active");

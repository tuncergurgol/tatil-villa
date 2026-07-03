-- CreateEnum
CREATE TYPE "PoolMeasureUnit" AS ENUM ('M', 'CM');

-- AlterTable
ALTER TABLE "Villa"
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 99,
ADD COLUMN "priceInclusionIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable (vitrin varsayılanları yeni kayıtlar için)
ALTER TABLE "Villa" ALTER COLUMN "popular" SET DEFAULT true;
ALTER TABLE "Villa" ALTER COLUMN "deal" SET DEFAULT true;
ALTER TABLE "Villa" ALTER COLUMN "recommended" SET DEFAULT true;

-- CreateTable
CREATE TABLE "VillaPool" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "measureUnit" "PoolMeasureUnit" NOT NULL DEFAULT 'M',
    "width" DOUBLE PRECISION,
    "length" DOUBLE PRECISION,
    "depth" DOUBLE PRECISION,
    "poolType" TEXT NOT NULL DEFAULT '',
    "purificationMethod" TEXT NOT NULL DEFAULT '',
    "heated" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VillaPool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VillaPool_villaId_idx" ON "VillaPool"("villaId");

-- CreateIndex
CREATE INDEX "VillaPool_sortOrder_idx" ON "VillaPool"("sortOrder");

-- CreateIndex
CREATE INDEX "Villa_sortOrder_idx" ON "Villa"("sortOrder");

-- AddForeignKey
ALTER TABLE "VillaPool" ADD CONSTRAINT "VillaPool_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

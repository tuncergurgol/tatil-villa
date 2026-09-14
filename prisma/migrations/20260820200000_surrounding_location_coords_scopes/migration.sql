-- AlterTable
ALTER TABLE "SurroundingLocation" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "SurroundingLocation" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "SurroundingLocation" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "SurroundingLocation_isDefault_idx" ON "SurroundingLocation"("isDefault");

-- CreateTable
CREATE TABLE "SurroundingLocationRegion" (
    "id" TEXT NOT NULL,
    "surroundingLocationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,

    CONSTRAINT "SurroundingLocationRegion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SurroundingLocationRegion_regionId_idx" ON "SurroundingLocationRegion"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "SurroundingLocationRegion_surroundingLocationId_regionId_key" ON "SurroundingLocationRegion"("surroundingLocationId", "regionId");

-- AddForeignKey
ALTER TABLE "SurroundingLocationRegion" ADD CONSTRAINT "SurroundingLocationRegion_surroundingLocationId_fkey" FOREIGN KEY ("surroundingLocationId") REFERENCES "SurroundingLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurroundingLocationRegion" ADD CONSTRAINT "SurroundingLocationRegion_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

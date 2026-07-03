-- AlterTable
ALTER TABLE "Villa"
ADD COLUMN "latitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "longitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "videoUrl" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "VillaSurroundingDistance" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "surroundingLocationId" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "VillaSurroundingDistance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VillaSurroundingDistance_villaId_idx" ON "VillaSurroundingDistance"("villaId");

-- CreateIndex
CREATE INDEX "VillaSurroundingDistance_surroundingLocationId_idx" ON "VillaSurroundingDistance"("surroundingLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "VillaSurroundingDistance_villaId_surroundingLocationId_key" ON "VillaSurroundingDistance"("villaId", "surroundingLocationId");

-- AddForeignKey
ALTER TABLE "VillaSurroundingDistance" ADD CONSTRAINT "VillaSurroundingDistance_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VillaSurroundingDistance" ADD CONSTRAINT "VillaSurroundingDistance_surroundingLocationId_fkey" FOREIGN KEY ("surroundingLocationId") REFERENCES "SurroundingLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

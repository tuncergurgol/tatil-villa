-- CreateTable
CREATE TABLE "VillaRoom" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "roomType" TEXT NOT NULL DEFAULT 'yatak_odasi',
    "name" TEXT NOT NULL,
    "singleBeds" INTEGER NOT NULL DEFAULT 0,
    "doubleBeds" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VillaRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VillaRoom_villaId_idx" ON "VillaRoom"("villaId");

-- CreateIndex
CREATE INDEX "VillaRoom_sortOrder_idx" ON "VillaRoom"("sortOrder");

-- AddForeignKey
ALTER TABLE "VillaRoom" ADD CONSTRAINT "VillaRoom_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

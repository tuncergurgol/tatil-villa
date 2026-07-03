-- AlterTable
ALTER TABLE "Villa"
ADD COLUMN "icalExportToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
ADD COLUMN "whatsappGroupId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "whatsappGroupDifferentName" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "VillaIcalSource" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VillaIcalSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VillaIcalSyncEvent" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VillaIcalSyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VillaIcalSource_villaId_idx" ON "VillaIcalSource"("villaId");

-- CreateIndex
CREATE INDEX "VillaIcalSource_sortOrder_idx" ON "VillaIcalSource"("sortOrder");

-- CreateIndex
CREATE INDEX "VillaIcalSyncEvent_villaId_idx" ON "VillaIcalSyncEvent"("villaId");

-- CreateIndex
CREATE INDEX "VillaIcalSyncEvent_createdAt_idx" ON "VillaIcalSyncEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "VillaIcalSource" ADD CONSTRAINT "VillaIcalSource_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VillaIcalSyncEvent" ADD CONSTRAINT "VillaIcalSyncEvent_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "VillaPoolPeriod" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "heatingFee" INTEGER,
    "heatingFeeCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
    "poolOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VillaPoolPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VillaPoolPeriod_poolId_idx" ON "VillaPoolPeriod"("poolId");

-- CreateIndex
CREATE INDEX "VillaPoolPeriod_poolId_startDate_endDate_idx" ON "VillaPoolPeriod"("poolId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "VillaPoolPeriod" ADD CONSTRAINT "VillaPoolPeriod_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "VillaPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

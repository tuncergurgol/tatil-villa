CREATE TABLE "VillaPricePeriod" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "nightlyPrice" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VillaPricePeriod_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VillaPricePeriod_villaId_idx" ON "VillaPricePeriod"("villaId");
CREATE INDEX "VillaPricePeriod_villaId_startDate_idx" ON "VillaPricePeriod"("villaId", "startDate");
CREATE INDEX "VillaPricePeriod_villaId_endDate_idx" ON "VillaPricePeriod"("villaId", "endDate");

ALTER TABLE "VillaPricePeriod" ADD CONSTRAINT "VillaPricePeriod_villaId_fkey"
  FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

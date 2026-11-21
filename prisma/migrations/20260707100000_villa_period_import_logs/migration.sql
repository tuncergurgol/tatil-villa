CREATE TYPE "PeriodImportStatus" AS ENUM ('SUCCESS', 'ERROR');

CREATE TABLE "VillaPeriodImportLog" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "sourceSlug" TEXT NOT NULL,
    "status" "PeriodImportStatus" NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "periodCount" INTEGER NOT NULL DEFAULT 0,
    "dayCount" INTEGER NOT NULL DEFAULT 0,
    "bookedDays" INTEGER NOT NULL DEFAULT 0,
    "optionDays" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "attemptedAt" TIMESTAMP(3),
    "succeededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VillaPeriodImportLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VillaPeriodImportLog_villaId_key" ON "VillaPeriodImportLog"("villaId");
CREATE INDEX "VillaPeriodImportLog_status_idx" ON "VillaPeriodImportLog"("status");
CREATE INDEX "VillaPeriodImportLog_attemptedAt_idx" ON "VillaPeriodImportLog"("attemptedAt");

ALTER TABLE "VillaPeriodImportLog" ADD CONSTRAINT "VillaPeriodImportLog_villaId_fkey"
  FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- iCal import tracking (additive only)
ALTER TABLE "VillaIcalSource"
  ADD COLUMN IF NOT EXISTS "lastSyncStatus" TEXT NOT NULL DEFAULT '';

ALTER TABLE "VillaIcalSource"
  ADD COLUMN IF NOT EXISTS "lastSyncMessage" TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "VillaIcalImportedBlock" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "villaId" TEXT NOT NULL,
  "externalUid" TEXT NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VillaIcalImportedBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VillaIcalImportedBlock_sourceId_externalUid_key"
  ON "VillaIcalImportedBlock"("sourceId", "externalUid");

CREATE INDEX IF NOT EXISTS "VillaIcalImportedBlock_villaId_idx"
  ON "VillaIcalImportedBlock"("villaId");

CREATE INDEX IF NOT EXISTS "VillaIcalImportedBlock_sourceId_idx"
  ON "VillaIcalImportedBlock"("sourceId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'VillaIcalImportedBlock_sourceId_fkey'
  ) THEN
    ALTER TABLE "VillaIcalImportedBlock"
      ADD CONSTRAINT "VillaIcalImportedBlock_sourceId_fkey"
      FOREIGN KEY ("sourceId") REFERENCES "VillaIcalSource"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Expand Booking with reservation form fields

CREATE TYPE "StayStatus" AS ENUM ('BEKLENIYOR', 'YAPILDI', 'YAPILMADI');

ALTER TABLE "Booking"
  ADD COLUMN "externalCode" INTEGER,
  ADD COLUMN "stayStatus" "StayStatus" NOT NULL DEFAULT 'BEKLENIYOR',
  ADD COLUMN "details" JSONB NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX "Booking_externalCode_key" ON "Booking"("externalCode");
CREATE INDEX "Booking_stayStatus_idx" ON "Booking"("stayStatus");
CREATE INDEX "Booking_externalCode_idx" ON "Booking"("externalCode");

-- Backfill external codes from imported guest emails
UPDATE "Booking"
SET "externalCode" = CAST(substring("guestEmail" from '^import-(\d+)@') AS INTEGER)
WHERE "guestEmail" ~ '^import-[0-9]+@'
  AND "externalCode" IS NULL;

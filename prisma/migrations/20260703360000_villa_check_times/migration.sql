-- AlterTable
ALTER TABLE "Villa"
ADD COLUMN "checkInTime" TEXT NOT NULL DEFAULT '16:00',
ADD COLUMN "checkOutTime" TEXT NOT NULL DEFAULT '10:00';

UPDATE "Villa"
SET
  "checkInTime" = COALESCE(NULLIF("checkInStart", ''), '16:00'),
  "checkOutTime" = COALESCE(NULLIF("checkOutStart", ''), '10:00');

ALTER TABLE "Villa"
DROP COLUMN "checkInStart",
DROP COLUMN "checkInEnd",
DROP COLUMN "checkOutStart",
DROP COLUMN "checkOutEnd";

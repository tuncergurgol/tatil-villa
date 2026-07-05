-- AlterEnum: expand BookingStatus with reservation workflow stages

CREATE TYPE "BookingStatus_new" AS ENUM (
  'NEW',
  'PREPAYMENT',
  'CONFIRMATION_SENT',
  'APPROVED',
  'COMPENSATION',
  'CANCELLED'
);

ALTER TABLE "Booking" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Booking"
  ALTER COLUMN "status" TYPE "BookingStatus_new"
  USING (
    CASE "status"::text
      WHEN 'PENDING' THEN 'NEW'
      WHEN 'CONFIRMED' THEN 'APPROVED'
      WHEN 'CANCELLED' THEN 'CANCELLED'
      ELSE 'NEW'
    END
  )::"BookingStatus_new";

DROP TYPE "BookingStatus";

ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";

ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'NEW';

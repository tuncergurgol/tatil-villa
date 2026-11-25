-- Rename APPROVED back to CONFIRMED for booking workflow

ALTER TYPE "BookingStatus" RENAME VALUE 'APPROVED' TO 'CONFIRMED';

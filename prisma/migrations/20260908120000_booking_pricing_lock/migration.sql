-- Onaylanmis rezervasyonlarda fiyat kalemlerini donduran kilit alanlari.
-- Snapshot verisi Booking.details JSON icinde (pricingSnapshot) tutulur.
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "pricingLockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pricingLockedById" TEXT,
  ADD COLUMN IF NOT EXISTS "pricingVersion" INTEGER NOT NULL DEFAULT 1;

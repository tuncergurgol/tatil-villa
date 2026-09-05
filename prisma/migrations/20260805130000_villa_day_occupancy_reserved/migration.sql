-- Bizim onaylı rezervasyonlar: BOOKED (kırmızı kapama) ile ayrışır.
ALTER TYPE "VillaDayOccupancy" ADD VALUE IF NOT EXISTS 'RESERVED' AFTER 'BOOKED';

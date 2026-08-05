-- Bizim onaylı rezervasyonlar: BOOKED (kırmızı kapama) ile ayrışır.
ALTER TYPE "VillaDayOccupancy" ADD VALUE 'RESERVED' AFTER 'BOOKED';

-- Mevcut onaylı rezervasyon gecelerini yeşil RESERVED yap.
UPDATE "VillaPricePeriodDay" AS d
SET "occupancyStatus" = 'RESERVED'
FROM "Booking" AS b
WHERE b."villaId" = d."villaId"
  AND b.status = 'CONFIRMED'
  AND d.date >= b."checkIn"
  AND d.date < b."checkOut"
  AND d."occupancyStatus" = 'BOOKED';

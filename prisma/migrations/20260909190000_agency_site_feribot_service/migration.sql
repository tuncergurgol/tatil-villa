-- Feribot hizmetini mevcut acente sitelerine ekle
UPDATE "AgencySite"
SET "publishedServices" = array_append("publishedServices", 'feribot')
WHERE NOT ('feribot' = ANY ("publishedServices"));

ALTER TABLE "AgencySite"
ALTER COLUMN "publishedServices"
SET DEFAULT ARRAY['villa', 'tur', 'otel', 'ucak-otobus', 'transfer', 'arac', 'gunubirlik', 'feribot']::TEXT[];

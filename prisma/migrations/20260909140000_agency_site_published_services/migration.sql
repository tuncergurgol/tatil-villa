-- Acente sitelerinde yayınlanan hizmetler (ana sayfa arama sekmeleri)
ALTER TABLE "AgencySite"
ADD COLUMN "publishedServices" TEXT[] DEFAULT ARRAY['villa', 'tur', 'otel', 'ucak-otobus', 'transfer', 'arac', 'gunubirlik']::TEXT[];

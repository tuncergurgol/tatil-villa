-- Belgesi olmayan villaların hangi public sitelerde yayınlanacağı (varsayılan: hiçbiri)

ALTER TABLE "CompanySettings"
ADD COLUMN "publishUndocumentedVillaSiteKeys" TEXT[] DEFAULT ARRAY[]::TEXT[];

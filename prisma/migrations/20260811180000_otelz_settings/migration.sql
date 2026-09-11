-- Otelz partner affiliate ayarları
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "otelzEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "otelzAffiliateTo" TEXT NOT NULL DEFAULT '1857';
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "otelzAffiliateCid" TEXT NOT NULL DEFAULT '274';

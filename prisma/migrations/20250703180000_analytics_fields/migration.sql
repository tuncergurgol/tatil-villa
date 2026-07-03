-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN "googleAdsId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "microsoftClarityId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "googleTagManagerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "facebookPixelId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "googleSearchConsoleCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "headScripts" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "bodyScripts" TEXT NOT NULL DEFAULT '';

-- Migrate legacy customScripts into headScripts
UPDATE "CompanySettings"
SET "headScripts" = "customScripts"
WHERE "customScripts" <> '' AND "headScripts" = '';

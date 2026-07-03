-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN "tursabEnvironment" TEXT NOT NULL DEFAULT 'production';
ALTER TABLE "CompanySettings" ADD COLUMN "tursabWhiteLabelUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "tursabVerificationLogoUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "taxNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "taxOffice" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "mersisNo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "tradeRegistryNo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "chamberOfCommerce" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "kepAddress" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "biletallEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "biletallPortalSlug" TEXT NOT NULL DEFAULT 'tatildeyizcomtr';

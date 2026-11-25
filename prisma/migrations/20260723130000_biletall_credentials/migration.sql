-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "biletallUsername" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "biletallPassword" TEXT NOT NULL DEFAULT '';

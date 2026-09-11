-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "biletallRoutesJson" TEXT NOT NULL DEFAULT '';

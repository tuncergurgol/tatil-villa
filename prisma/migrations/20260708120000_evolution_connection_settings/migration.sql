-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN "evolutionBaseUrl" TEXT NOT NULL DEFAULT 'http://localhost:8080';
ALTER TABLE "CompanySettings" ADD COLUMN "evolutionApiKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "evolutionInstanceName" TEXT NOT NULL DEFAULT 'tatil-villa';

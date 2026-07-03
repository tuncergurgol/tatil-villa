-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN "phone2" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "officePhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "workingHours" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "googleMapsEmbed" TEXT NOT NULL DEFAULT '';

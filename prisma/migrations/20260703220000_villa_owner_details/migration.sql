-- CreateEnum
CREATE TYPE "VillaOwnerType" AS ENUM ('GERCEK_KISI', 'TUZEL_KISI');

-- AlterTable
ALTER TABLE "VillaOwner" ADD COLUMN     "type" "VillaOwnerType" NOT NULL DEFAULT 'GERCEK_KISI',
ADD COLUMN     "firstName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lastName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "companyTitle" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "authorizedPersonName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tcKimlikNo" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "taxOffice" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "taxNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bankAccountHolder" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bankIban" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "accountingCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'Türkiye',
ADD COLUMN     "mernisIlceCode" TEXT,
ADD COLUMN     "address" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "VillaOwner_type_idx" ON "VillaOwner"("type");

-- CreateEnum
CREATE TYPE "VillaDayOccupancy" AS ENUM ('EMPTY', 'BOOKED', 'OPTION');

-- AlterTable
ALTER TABLE "VillaPricePeriod" ADD COLUMN     "weekendPrice" INTEGER,
ADD COLUMN     "weekendDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "weekendMinStayNights" INTEGER,
ADD COLUMN     "childFee02" INTEGER,
ADD COLUMN     "childFee02Currency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
ADD COLUMN     "childFee03_09" INTEGER,
ADD COLUMN     "childFee03_09Currency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL';

-- AlterTable
ALTER TABLE "VillaPricePeriodDay" ADD COLUMN     "weekendPrice" INTEGER,
ADD COLUMN     "weekendDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "weekendMinStayNights" INTEGER,
ADD COLUMN     "childFee02" INTEGER,
ADD COLUMN     "childFee02Currency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
ADD COLUMN     "childFee03_09" INTEGER,
ADD COLUMN     "childFee03_09Currency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
ADD COLUMN     "occupancyStatus" "VillaDayOccupancy" NOT NULL DEFAULT 'EMPTY';

-- CreateIndex
CREATE INDEX "VillaPricePeriodDay_villaId_occupancyStatus_idx" ON "VillaPricePeriodDay"("villaId", "occupancyStatus");

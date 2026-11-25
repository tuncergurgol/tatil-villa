-- AlterTable VillaPricePeriod
ALTER TABLE "VillaPricePeriod" ADD COLUMN IF NOT EXISTS "poolHeatingPrivateFee" INTEGER;
ALTER TABLE "VillaPricePeriod" ADD COLUMN IF NOT EXISTS "poolHeatingPrivateFeeCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL';
ALTER TABLE "VillaPricePeriod" ADD COLUMN IF NOT EXISTS "poolHeatingIndoorFee" INTEGER;
ALTER TABLE "VillaPricePeriod" ADD COLUMN IF NOT EXISTS "poolHeatingIndoorFeeCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL';
ALTER TABLE "VillaPricePeriod" ADD COLUMN IF NOT EXISTS "poolHeatingKidsFee" INTEGER;
ALTER TABLE "VillaPricePeriod" ADD COLUMN IF NOT EXISTS "poolHeatingKidsFeeCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL';

-- AlterTable VillaPricePeriodDay
ALTER TABLE "VillaPricePeriodDay" ADD COLUMN IF NOT EXISTS "poolHeatingPrivateFee" INTEGER;
ALTER TABLE "VillaPricePeriodDay" ADD COLUMN IF NOT EXISTS "poolHeatingPrivateFeeCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL';
ALTER TABLE "VillaPricePeriodDay" ADD COLUMN IF NOT EXISTS "poolHeatingIndoorFee" INTEGER;
ALTER TABLE "VillaPricePeriodDay" ADD COLUMN IF NOT EXISTS "poolHeatingIndoorFeeCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL';
ALTER TABLE "VillaPricePeriodDay" ADD COLUMN IF NOT EXISTS "poolHeatingKidsFee" INTEGER;
ALTER TABLE "VillaPricePeriodDay" ADD COLUMN IF NOT EXISTS "poolHeatingKidsFeeCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL';

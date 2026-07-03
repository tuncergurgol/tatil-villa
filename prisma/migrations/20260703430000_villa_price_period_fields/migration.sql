CREATE TYPE "VillaPeriodAvailability" AS ENUM ('available', 'closed');
CREATE TYPE "VillaPeriodCurrency" AS ENUM ('TL', 'EUR', 'USD', 'GBP');

ALTER TABLE "VillaPricePeriod"
  ADD COLUMN "availability" "VillaPeriodAvailability" NOT NULL DEFAULT 'available',
  ADD COLUMN "nightlyPriceCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
  ADD COLUMN "weeklyPrice" INTEGER,
  ADD COLUMN "prepaymentRate" INTEGER,
  ADD COLUMN "commissionRate" INTEGER,
  ADD COLUMN "nightlyPriceWithoutCommission" INTEGER,
  ADD COLUMN "discountedNightlyPrice" INTEGER,
  ADD COLUMN "minStayNights" INTEGER,
  ADD COLUMN "cleaningDayCount" INTEGER,
  ADD COLUMN "cleaningFee" INTEGER,
  ADD COLUMN "cleaningFeeCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
  ADD COLUMN "damageDeposit" INTEGER,
  ADD COLUMN "damageDepositCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
  ADD COLUMN "petCleaningFee" INTEGER,
  ADD COLUMN "petCleaningFeeCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
  ADD COLUMN "petDamageDeposit" INTEGER,
  ADD COLUMN "petDamageDepositCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
  ADD COLUMN "underfloorHeatingFee" INTEGER,
  ADD COLUMN "underfloorHeatingFeeCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
  ADD COLUMN "extraBedFee" INTEGER,
  ADD COLUMN "extraBedFeeCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
  ADD COLUMN "discount1Rate" INTEGER,
  ADD COLUMN "discount2Rate" INTEGER,
  ADD COLUMN "extraDiscountAmount" INTEGER;

CREATE TABLE "VillaPricePeriodDay" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "availability" "VillaPeriodAvailability" NOT NULL DEFAULT 'available',
    "nightlyPrice" INTEGER NOT NULL,
    "nightlyPriceCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
    "nightlyPriceWithoutCommission" INTEGER,
    "discountedNightlyPrice" INTEGER,
    "weeklyPrice" INTEGER,
    "prepaymentRate" INTEGER,
    "commissionRate" INTEGER,
    "minStayNights" INTEGER,
    "cleaningDayCount" INTEGER,
    "cleaningFee" INTEGER,
    "cleaningFeeCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
    "damageDeposit" INTEGER,
    "damageDepositCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
    "petCleaningFee" INTEGER,
    "petCleaningFeeCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
    "petDamageDeposit" INTEGER,
    "petDamageDepositCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
    "underfloorHeatingFee" INTEGER,
    "underfloorHeatingFeeCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
    "extraBedFee" INTEGER,
    "extraBedFeeCurrency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
    "discount1Rate" INTEGER,
    "discount2Rate" INTEGER,
    "extraDiscountAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VillaPricePeriodDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VillaPricePeriodDay_villaId_date_key" ON "VillaPricePeriodDay"("villaId", "date");
CREATE INDEX "VillaPricePeriodDay_periodId_idx" ON "VillaPricePeriodDay"("periodId");
CREATE INDEX "VillaPricePeriodDay_villaId_date_idx" ON "VillaPricePeriodDay"("villaId", "date");

ALTER TABLE "VillaPricePeriodDay" ADD CONSTRAINT "VillaPricePeriodDay_periodId_fkey"
  FOREIGN KEY ("periodId") REFERENCES "VillaPricePeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VillaPricePeriodDay" ADD CONSTRAINT "VillaPricePeriodDay_villaId_fkey"
  FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

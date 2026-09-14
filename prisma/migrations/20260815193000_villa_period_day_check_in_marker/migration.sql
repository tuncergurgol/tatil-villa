-- Aynı gündeki çıkış + giriş ile ertesi gün girişini kesin ayırt eder.
ALTER TABLE "VillaPricePeriodDay"
ADD COLUMN "occupancyCheckIn" BOOLEAN NOT NULL DEFAULT false;

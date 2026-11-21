-- Periyottan bağımsız villa indirim çalışmaları (Hızlı Fiyat listesi).
CREATE TABLE "VillaPriceDiscount" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "discount1Rate" INTEGER,
    "discount2Rate" INTEGER,
    "extraDiscountAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VillaPriceDiscount_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VillaPriceDiscount_villaId_idx" ON "VillaPriceDiscount"("villaId");
CREATE INDEX "VillaPriceDiscount_villaId_startDate_endDate_idx" ON "VillaPriceDiscount"("villaId", "startDate", "endDate");

ALTER TABLE "VillaPriceDiscount"
ADD CONSTRAINT "VillaPriceDiscount_villaId_fkey"
FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

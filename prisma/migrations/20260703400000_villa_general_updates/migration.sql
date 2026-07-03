-- SalesType enum
CREATE TYPE "SalesType" AS ENUM ('komisyon', 'garanti');

-- Salon alanı
ALTER TABLE "Villa" ADD COLUMN "livingRooms" INTEGER NOT NULL DEFAULT 0;

-- Satış türü enum'a dönüştür
ALTER TABLE "Villa" ALTER COLUMN "salesType" DROP DEFAULT;
ALTER TABLE "Villa" ALTER COLUMN "salesType" TYPE "SalesType" USING (
  CASE lower("salesType")
    WHEN 'garanti' THEN 'garanti'::"SalesType"
    ELSE 'komisyon'::"SalesType"
  END
);
ALTER TABLE "Villa" ALTER COLUMN "salesType" SET DEFAULT 'komisyon'::"SalesType";

-- Ön ödeme ödeme tipi tanımları
CREATE TABLE "PrepaymentPaymentTypeOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrepaymentPaymentTypeOption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrepaymentPaymentTypeOption_active_idx" ON "PrepaymentPaymentTypeOption"("active");
CREATE INDEX "PrepaymentPaymentTypeOption_sortOrder_idx" ON "PrepaymentPaymentTypeOption"("sortOrder");

INSERT INTO "PrepaymentPaymentTypeOption" ("id", "name", "sortOrder", "active", "updatedAt") VALUES
  ('prepay_checkin_plus_1_day', 'Giriş + 1 gün', 0, true, CURRENT_TIMESTAMP),
  ('prepay_checkin', 'Giriş', 1, true, CURRENT_TIMESTAMP),
  ('prepay_reservation', 'Rezervasyon', 2, true, CURRENT_TIMESTAMP),
  ('prepay_checkout', 'Çıkış', 3, true, CURRENT_TIMESTAMP);

ALTER TABLE "Villa" ADD COLUMN "prepaymentPaymentTypeId" TEXT;

UPDATE "Villa" SET "prepaymentPaymentTypeId" = CASE "prepaymentPaymentType"::text
  WHEN 'CHECKIN_PLUS_1_DAY' THEN 'prepay_checkin_plus_1_day'
  WHEN 'CHECKIN' THEN 'prepay_checkin'
  WHEN 'RESERVATION' THEN 'prepay_reservation'
  WHEN 'CHECKOUT' THEN 'prepay_checkout'
  ELSE 'prepay_checkin_plus_1_day'
END;

ALTER TABLE "Villa" DROP COLUMN "prepaymentPaymentType";
DROP TYPE "PrepaymentPaymentType";

ALTER TABLE "Villa" ADD CONSTRAINT "Villa_prepaymentPaymentTypeId_fkey"
  FOREIGN KEY ("prepaymentPaymentTypeId") REFERENCES "PrepaymentPaymentTypeOption"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Villa_prepaymentPaymentTypeId_idx" ON "Villa"("prepaymentPaymentTypeId");

-- Tesis tipi: villa / apart / suit_daire
CREATE TYPE "VillaCategory_new" AS ENUM ('villa', 'apart', 'suit_daire');

ALTER TABLE "Villa" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Villa" ALTER COLUMN "category" TYPE "VillaCategory_new" USING (
  CASE "category"::text
    WHEN 'bungalov' THEN 'apart'::"VillaCategory_new"
    ELSE "category"::text::"VillaCategory_new"
  END
);

DROP TYPE "VillaCategory";
ALTER TYPE "VillaCategory_new" RENAME TO "VillaCategory";
ALTER TABLE "Villa" ALTER COLUMN "category" SET DEFAULT 'villa'::"VillaCategory";

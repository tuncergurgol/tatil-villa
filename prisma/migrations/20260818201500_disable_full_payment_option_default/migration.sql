-- Tüm villalarda Tam Ödeme seçeneğini kapat; yeni villalarda varsayılan kapalı.
UPDATE "Villa" SET "allowFullPaymentOption" = false;
ALTER TABLE "Villa" ALTER COLUMN "allowFullPaymentOption" SET DEFAULT false;

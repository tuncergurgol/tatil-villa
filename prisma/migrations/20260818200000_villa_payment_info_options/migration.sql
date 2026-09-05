-- Rezervasyon ödeme ekranı: ön ödeme / tam ödeme seçenekleri (villa kuralları).
ALTER TABLE "Villa" ADD COLUMN "allowPrepaymentOption" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Villa" ADD COLUMN "allowFullPaymentOption" BOOLEAN NOT NULL DEFAULT true;

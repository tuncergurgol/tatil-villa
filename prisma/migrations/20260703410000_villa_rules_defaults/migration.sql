ALTER TABLE "Villa" ALTER COLUMN "allowBaby" SET DEFAULT true;
ALTER TABLE "Villa" ALTER COLUMN "allowChildren" SET DEFAULT true;
ALTER TABLE "Villa" ALTER COLUMN "prepaymentPaymentTypeId" SET DEFAULT 'prepay_checkin_plus_1_day';

UPDATE "Villa"
SET "prepaymentPaymentTypeId" = 'prepay_checkin_plus_1_day'
WHERE "prepaymentPaymentTypeId" IS NULL;

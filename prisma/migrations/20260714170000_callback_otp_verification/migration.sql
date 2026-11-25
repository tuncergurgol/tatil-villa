-- Expand CallbackRequestStatus with PENDING / VERIFIED (OTP flow)

CREATE TYPE "CallbackRequestStatus_new" AS ENUM (
  'PENDING',
  'VERIFIED',
  'NEW',
  'CONTACTED',
  'CLOSED',
  'CANCELLED'
);

ALTER TABLE "CallbackRequest" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "CallbackRequest"
  ALTER COLUMN "status" TYPE "CallbackRequestStatus_new"
  USING ("status"::text::"CallbackRequestStatus_new");

DROP TYPE "CallbackRequestStatus";

ALTER TYPE "CallbackRequestStatus_new" RENAME TO "CallbackRequestStatus";

ALTER TABLE "CallbackRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "CallbackRequest" ADD COLUMN "verifiedAt" TIMESTAMP(3);

ALTER TABLE "CompanySettings" ADD COLUMN "smsOtpEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "payload" JSONB,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VerificationCode_code_purpose_phone_key"
  ON "VerificationCode"("code", "purpose", "phone");

CREATE INDEX "VerificationCode_phone_purpose_idx"
  ON "VerificationCode"("phone", "purpose");

CREATE INDEX "VerificationCode_expiresAt_idx"
  ON "VerificationCode"("expiresAt");

CREATE INDEX "VerificationCode_purpose_usedAt_idx"
  ON "VerificationCode"("purpose", "usedAt");

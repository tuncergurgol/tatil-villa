-- Sizi Arayalım / OTP isteklerini IP + cihaz kimliği ile takip et.
ALTER TABLE "CallbackRequest" ADD COLUMN "clientIp" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CallbackRequest" ADD COLUMN "deviceToken" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CallbackRequest" ADD COLUMN "userAgent" TEXT NOT NULL DEFAULT '';

CREATE INDEX "CallbackRequest_clientIp_createdAt_idx"
  ON "CallbackRequest"("clientIp", "createdAt");

CREATE TABLE "PublicRequestGuardEvent" (
    "id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "clientIp" TEXT NOT NULL DEFAULT '',
    "deviceToken" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicRequestGuardEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicRequestGuardEvent_purpose_createdAt_idx"
  ON "PublicRequestGuardEvent"("purpose", "createdAt");
CREATE INDEX "PublicRequestGuardEvent_clientIp_createdAt_idx"
  ON "PublicRequestGuardEvent"("clientIp", "createdAt");
CREATE INDEX "PublicRequestGuardEvent_deviceToken_createdAt_idx"
  ON "PublicRequestGuardEvent"("deviceToken", "createdAt");
CREATE INDEX "PublicRequestGuardEvent_phone_createdAt_idx"
  ON "PublicRequestGuardEvent"("phone", "createdAt");
CREATE INDEX "PublicRequestGuardEvent_blocked_createdAt_idx"
  ON "PublicRequestGuardEvent"("blocked", "createdAt");

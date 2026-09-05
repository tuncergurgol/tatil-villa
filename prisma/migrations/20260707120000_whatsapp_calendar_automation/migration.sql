CREATE TYPE "WhatsappCalendarMessageStatus" AS ENUM ('APPLIED', 'IGNORED', 'FAILED', 'DUPLICATE');

CREATE TABLE "WhatsappCalendarGroup" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappCalendarGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsappCalendarGroup_externalId_key" ON "WhatsappCalendarGroup"("externalId");
CREATE INDEX "WhatsappCalendarGroup_active_idx" ON "WhatsappCalendarGroup"("active");

CREATE TABLE "WhatsappCalendarMessage" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "groupExternalId" TEXT NOT NULL,
    "villaId" TEXT,
    "senderName" TEXT NOT NULL DEFAULT '',
    "senderPhone" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "intent" TEXT NOT NULL DEFAULT '',
    "startDate" DATE,
    "endDate" DATE,
    "status" "WhatsappCalendarMessageStatus" NOT NULL,
    "resultMessage" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappCalendarMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsappCalendarMessage_externalId_key" ON "WhatsappCalendarMessage"("externalId");
CREATE INDEX "WhatsappCalendarMessage_groupExternalId_idx" ON "WhatsappCalendarMessage"("groupExternalId");
CREATE INDEX "WhatsappCalendarMessage_villaId_idx" ON "WhatsappCalendarMessage"("villaId");
CREATE INDEX "WhatsappCalendarMessage_status_idx" ON "WhatsappCalendarMessage"("status");
CREATE INDEX "WhatsappCalendarMessage_createdAt_idx" ON "WhatsappCalendarMessage"("createdAt");

ALTER TABLE "WhatsappCalendarMessage" ADD CONSTRAINT "WhatsappCalendarMessage_villaId_fkey"
  FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "whatsappCalendarEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "whatsappCalendarWebhookSecret" TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "Villa_whatsappGroupId_idx" ON "Villa"("whatsappGroupId");

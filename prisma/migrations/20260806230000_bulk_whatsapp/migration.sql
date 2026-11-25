-- Toplu WhatsApp mesaj kampanyaları

CREATE TYPE "BulkWhatsappSalutation" AS ENUM ('NONE', 'SAYIN');
CREATE TYPE "BulkWhatsappCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'STOPPED', 'COMPLETED');
CREATE TYPE "BulkWhatsappMessageStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

CREATE TABLE "BulkWhatsappTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkWhatsappTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BulkWhatsappCampaign" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "messageBody" TEXT NOT NULL,
    "salutation" "BulkWhatsappSalutation" NOT NULL DEFAULT 'NONE',
    "appendTimestamp" BOOLEAN NOT NULL DEFAULT false,
    "intervalSeconds" INTEGER NOT NULL DEFAULT 5,
    "status" "BulkWhatsappCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "tagFilterIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleFirstDate" DATE,
    "scheduleFirstTime" TEXT NOT NULL DEFAULT '10:00',
    "scheduleDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scheduleStartTime" TEXT NOT NULL DEFAULT '09:00',
    "scheduleEndTime" TEXT NOT NULL DEFAULT '18:00',
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastProcessedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkWhatsappCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BulkWhatsappOutboundMessage" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "tagLabels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "renderedBody" TEXT NOT NULL,
    "status" "BulkWhatsappMessageStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkWhatsappOutboundMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BulkWhatsappTemplate_createdAt_idx" ON "BulkWhatsappTemplate"("createdAt");
CREATE INDEX "BulkWhatsappCampaign_status_idx" ON "BulkWhatsappCampaign"("status");
CREATE INDEX "BulkWhatsappCampaign_scheduleEnabled_status_idx" ON "BulkWhatsappCampaign"("scheduleEnabled", "status");
CREATE INDEX "BulkWhatsappCampaign_createdAt_idx" ON "BulkWhatsappCampaign"("createdAt");
CREATE INDEX "BulkWhatsappOutboundMessage_campaignId_status_idx" ON "BulkWhatsappOutboundMessage"("campaignId", "status");
CREATE INDEX "BulkWhatsappOutboundMessage_status_idx" ON "BulkWhatsappOutboundMessage"("status");
CREATE INDEX "BulkWhatsappOutboundMessage_customerId_idx" ON "BulkWhatsappOutboundMessage"("customerId");
CREATE INDEX "BulkWhatsappOutboundMessage_createdAt_idx" ON "BulkWhatsappOutboundMessage"("createdAt");

ALTER TABLE "BulkWhatsappCampaign" ADD CONSTRAINT "BulkWhatsappCampaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BulkWhatsappTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BulkWhatsappOutboundMessage" ADD CONSTRAINT "BulkWhatsappOutboundMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "BulkWhatsappCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BulkWhatsappOutboundMessage" ADD CONSTRAINT "BulkWhatsappOutboundMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

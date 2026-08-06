-- Facebook Lead Ads CRM

CREATE TYPE "FacebookLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST', 'SPAM');

CREATE TABLE "FacebookLead" (
    "id" TEXT NOT NULL,
    "externalLeadId" TEXT NOT NULL,
    "formId" TEXT NOT NULL DEFAULT '',
    "formName" TEXT NOT NULL DEFAULT '',
    "pageId" TEXT NOT NULL DEFAULT '',
    "pageName" TEXT NOT NULL DEFAULT '',
    "adId" TEXT NOT NULL DEFAULT '',
    "adName" TEXT NOT NULL DEFAULT '',
    "campaignId" TEXT NOT NULL DEFAULT '',
    "campaignName" TEXT NOT NULL DEFAULT '',
    "fullName" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "customFieldsJson" JSONB,
    "status" "FacebookLeadStatus" NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT NOT NULL DEFAULT '',
    "contactAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastContactAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "contactedBy" TEXT NOT NULL DEFAULT '',
    "adminSeenAt" TIMESTAMP(3),
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacebookLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FacebookLeadContactLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacebookLeadContactLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FacebookLead_externalLeadId_key" ON "FacebookLead"("externalLeadId");
CREATE INDEX "FacebookLead_status_createdAt_idx" ON "FacebookLead"("status", "createdAt");
CREATE INDEX "FacebookLead_adminSeenAt_idx" ON "FacebookLead"("adminSeenAt");
CREATE INDEX "FacebookLead_nextFollowUpAt_idx" ON "FacebookLead"("nextFollowUpAt");
CREATE INDEX "FacebookLead_createdAt_idx" ON "FacebookLead"("createdAt");
CREATE INDEX "FacebookLead_phone_idx" ON "FacebookLead"("phone");
CREATE INDEX "FacebookLeadContactLog_leadId_createdAt_idx" ON "FacebookLeadContactLog"("leadId", "createdAt");

ALTER TABLE "FacebookLeadContactLog" ADD CONSTRAINT "FacebookLeadContactLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "FacebookLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanySettings" ADD COLUMN "facebookLeadEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CompanySettings" ADD COLUMN "facebookLeadAppId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "facebookLeadAppSecret" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "facebookLeadVerifyToken" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "facebookLeadPageId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN "facebookLeadPageAccessToken" TEXT NOT NULL DEFAULT '';

-- CreateEnum
CREATE TYPE "CampaignDisplayType" AS ENUM ('SLIDER', 'BOX');

-- CreateEnum
CREATE TYPE "CallbackPreferredDay" AS ENUM ('TODAY', 'TOMORROW', 'THIS_WEEK', 'ANY');

-- CreateEnum
CREATE TYPE "CallbackPreferredTime" AS ENUM ('ASAP', 'MORNING', 'AFTERNOON', 'EVENING');

-- CreateEnum
CREATE TYPE "CallbackRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "displayType" "CampaignDisplayType" NOT NULL DEFAULT 'SLIDER';
ALTER TABLE "Campaign" ALTER COLUMN "cta" SET DEFAULT 'İncele';

-- CreateIndex
CREATE INDEX "Campaign_active_displayType_sortOrder_idx" ON "Campaign"("active", "displayType", "sortOrder");

-- CreateTable
CREATE TABLE "CallbackRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "preferredDay" "CallbackPreferredDay" NOT NULL DEFAULT 'ANY',
    "preferredTime" "CallbackPreferredTime" NOT NULL DEFAULT 'ASAP',
    "status" "CallbackRequestStatus" NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallbackRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallbackRequest_status_createdAt_idx" ON "CallbackRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CallbackRequest_phone_idx" ON "CallbackRequest"("phone");

-- CreateIndex
CREATE INDEX "CallbackRequest_createdAt_idx" ON "CallbackRequest"("createdAt");

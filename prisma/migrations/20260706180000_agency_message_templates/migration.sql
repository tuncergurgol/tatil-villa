-- CreateTable
CREATE TABLE "AgencyMessageTemplate" (
    "id" TEXT NOT NULL,
    "rowNo" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "smsBody" TEXT NOT NULL DEFAULT '',
    "whatsappBody" TEXT NOT NULL DEFAULT '',
    "mailBody" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyMessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgencyMessageTemplate_active_idx" ON "AgencyMessageTemplate"("active");

-- CreateIndex
CREATE INDEX "AgencyMessageTemplate_sortOrder_idx" ON "AgencyMessageTemplate"("sortOrder");

-- CreateIndex
CREATE INDEX "AgencyMessageTemplate_rowNo_idx" ON "AgencyMessageTemplate"("rowNo");

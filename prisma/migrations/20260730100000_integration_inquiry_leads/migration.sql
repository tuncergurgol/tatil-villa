-- AlterTable
ALTER TABLE "Yolcu360Order" ADD COLUMN "adminSeenAt" TIMESTAMP(3),
ADD COLUMN "staffNotifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BiletallInquiry" (
    "id" TEXT NOT NULL,
    "sourceSite" TEXT NOT NULL DEFAULT '',
    "sourceDomain" TEXT NOT NULL DEFAULT '',
    "pnr" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "rawQuery" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "staffNotifiedAt" TIMESTAMP(3),
    "adminSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiletallInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BiletallInquiry_status_idx" ON "BiletallInquiry"("status");

-- CreateIndex
CREATE INDEX "BiletallInquiry_createdAt_idx" ON "BiletallInquiry"("createdAt");

-- CreateIndex
CREATE INDEX "BiletallInquiry_pnr_idx" ON "BiletallInquiry"("pnr");

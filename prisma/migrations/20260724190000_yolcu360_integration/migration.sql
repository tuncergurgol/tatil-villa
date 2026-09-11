-- CreateTable
CREATE TABLE "Yolcu360Settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "publicEnabled" BOOLEAN NOT NULL DEFAULT true,
    "environment" TEXT NOT NULL DEFAULT 'staging',
    "apiKey" TEXT NOT NULL DEFAULT '',
    "apiSecret" TEXT NOT NULL DEFAULT '',
    "commissionType" TEXT NOT NULL DEFAULT 'percentage',
    "commissionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "defaultPaymentType" TEXT NOT NULL DEFAULT 'creditCard',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Yolcu360Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Yolcu360Order" (
    "id" TEXT NOT NULL,
    "yolcu360OrderId" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "passengerName" TEXT NOT NULL DEFAULT '',
    "passengerEmail" TEXT NOT NULL DEFAULT '',
    "passengerPhone" TEXT NOT NULL DEFAULT '',
    "carBrand" TEXT NOT NULL DEFAULT '',
    "carModel" TEXT NOT NULL DEFAULT '',
    "vendorName" TEXT NOT NULL DEFAULT '',
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "searchSnapshot" JSONB,
    "rawOrder" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Yolcu360Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Yolcu360Order_yolcu360OrderId_key" ON "Yolcu360Order"("yolcu360OrderId");

-- CreateIndex
CREATE INDEX "Yolcu360Order_status_idx" ON "Yolcu360Order"("status");

-- CreateIndex
CREATE INDEX "Yolcu360Order_createdAt_idx" ON "Yolcu360Order"("createdAt");

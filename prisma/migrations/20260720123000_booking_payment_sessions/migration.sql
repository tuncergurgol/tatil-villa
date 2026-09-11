-- CreateTable
CREATE TABLE "BookingPaymentSession" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "providerSlug" TEXT NOT NULL DEFAULT 'iyzico',
    "conversationId" TEXT NOT NULL,
    "token" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentId" TEXT,
    "paidPrice" INTEGER,
    "callbackDomain" TEXT NOT NULL DEFAULT '',
    "rawResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingPaymentSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingPaymentSession_bookingId_idx" ON "BookingPaymentSession"("bookingId");

-- CreateIndex
CREATE INDEX "BookingPaymentSession_conversationId_idx" ON "BookingPaymentSession"("conversationId");

-- CreateIndex
CREATE INDEX "BookingPaymentSession_token_idx" ON "BookingPaymentSession"("token");

-- CreateIndex
CREATE INDEX "BookingPaymentSession_status_idx" ON "BookingPaymentSession"("status");

-- AddForeignKey
ALTER TABLE "BookingPaymentSession" ADD CONSTRAINT "BookingPaymentSession_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

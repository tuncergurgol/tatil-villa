-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "optionExpiresAt" TIMESTAMP(3),
ADD COLUMN "confirmationSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BookingPrepayment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "paymentChannel" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingPrepayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Booking_optionExpiresAt_idx" ON "Booking"("optionExpiresAt");

-- CreateIndex
CREATE INDEX "BookingPrepayment_bookingId_idx" ON "BookingPrepayment"("bookingId");

-- AddForeignKey
ALTER TABLE "BookingPrepayment" ADD CONSTRAINT "BookingPrepayment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPrepayment" ADD CONSTRAINT "BookingPrepayment_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "CompanyBankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

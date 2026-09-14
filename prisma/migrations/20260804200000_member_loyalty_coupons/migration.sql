-- CreateEnum
CREATE TYPE "LoyaltyTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
CREATE TYPE "CouponDiscountType" AS ENUM ('FIXED', 'PERCENT');
CREATE TYPE "LoyaltyVoucherType" AS ENUM ('TIER_STAY', 'REFERRAL_REWARD', 'WELCOME', 'MANUAL');
CREATE TYPE "MemberReferralStatus" AS ENUM ('PENDING', 'COMPLETED', 'REWARDED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "customerId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "memberId" TEXT;

-- CreateTable
CREATE TABLE "MemberAccount" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "inviteCode" TEXT NOT NULL,
    "referredByMemberId" TEXT,
    "loyaltyTier" "LoyaltyTier" NOT NULL DEFAULT 'BRONZE',
    "completedStays" INTEGER NOT NULL DEFAULT 0,
    "couponBalance" INTEGER NOT NULL DEFAULT 0,
    "lastStayCompletedAt" TIMESTAMP(3),
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "kvkkAcceptedAt" TIMESTAMP(3),
    "membershipAcceptedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "registeredSiteKey" TEXT NOT NULL DEFAULT 'tatildeyiz',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MemberSession" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoyaltyVoucher" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "remainingAmount" INTEGER NOT NULL,
    "discountPercent" INTEGER,
    "type" "LoyaltyVoucherType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyVoucher_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MemberReferral" (
    "id" TEXT NOT NULL,
    "inviterMemberId" TEXT NOT NULL,
    "invitedMemberId" TEXT NOT NULL,
    "status" "MemberReferralStatus" NOT NULL DEFAULT 'PENDING',
    "rewardAmount" INTEGER NOT NULL DEFAULT 0,
    "firstBookingId" TEXT,
    "completedAt" TIMESTAMP(3),
    "rewardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberReferral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "CouponDiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "minBookingMultiplier" INTEGER NOT NULL DEFAULT 10,
    "maxDiscountAmount" INTEGER,
    "accommodationOnly" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "memberOnly" BOOLEAN NOT NULL DEFAULT false,
    "welcomeCoupon" BOOLEAN NOT NULL DEFAULT false,
    "referralCoupon" BOOLEAN NOT NULL DEFAULT false,
    "siteKey" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "memberId" TEXT,
    "bookingId" TEXT,
    "discountAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberAccount_customerId_key" ON "MemberAccount"("customerId");
CREATE UNIQUE INDEX "MemberAccount_phone_key" ON "MemberAccount"("phone");
CREATE UNIQUE INDEX "MemberAccount_inviteCode_key" ON "MemberAccount"("inviteCode");
CREATE INDEX "MemberAccount_email_idx" ON "MemberAccount"("email");
CREATE INDEX "MemberAccount_inviteCode_idx" ON "MemberAccount"("inviteCode");
CREATE INDEX "MemberAccount_loyaltyTier_idx" ON "MemberAccount"("loyaltyTier");
CREATE INDEX "MemberAccount_active_idx" ON "MemberAccount"("active");

CREATE UNIQUE INDEX "MemberSession_tokenHash_key" ON "MemberSession"("tokenHash");
CREATE INDEX "MemberSession_memberId_idx" ON "MemberSession"("memberId");
CREATE INDEX "MemberSession_expiresAt_idx" ON "MemberSession"("expiresAt");

CREATE INDEX "LoyaltyVoucher_memberId_idx" ON "LoyaltyVoucher"("memberId");
CREATE INDEX "LoyaltyVoucher_expiresAt_idx" ON "LoyaltyVoucher"("expiresAt");
CREATE INDEX "LoyaltyVoucher_bookingId_idx" ON "LoyaltyVoucher"("bookingId");

CREATE UNIQUE INDEX "MemberReferral_invitedMemberId_key" ON "MemberReferral"("invitedMemberId");
CREATE INDEX "MemberReferral_inviterMemberId_idx" ON "MemberReferral"("inviterMemberId");
CREATE INDEX "MemberReferral_status_idx" ON "MemberReferral"("status");

CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_active_idx" ON "Coupon"("active");
CREATE INDEX "Coupon_siteKey_idx" ON "Coupon"("siteKey");

CREATE INDEX "CouponRedemption_couponId_idx" ON "CouponRedemption"("couponId");
CREATE INDEX "CouponRedemption_memberId_idx" ON "CouponRedemption"("memberId");
CREATE INDEX "CouponRedemption_bookingId_idx" ON "CouponRedemption"("bookingId");

CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX "Booking_memberId_idx" ON "Booking"("memberId");
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemberAccount" ADD CONSTRAINT "MemberAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemberAccount" ADD CONSTRAINT "MemberAccount_referredByMemberId_fkey" FOREIGN KEY ("referredByMemberId") REFERENCES "MemberAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemberSession" ADD CONSTRAINT "MemberSession_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyVoucher" ADD CONSTRAINT "LoyaltyVoucher_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyVoucher" ADD CONSTRAINT "LoyaltyVoucher_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemberReferral" ADD CONSTRAINT "MemberReferral_inviterMemberId_fkey" FOREIGN KEY ("inviterMemberId") REFERENCES "MemberAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberReferral" ADD CONSTRAINT "MemberReferral_invitedMemberId_fkey" FOREIGN KEY ("invitedMemberId") REFERENCES "MemberAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberReferral" ADD CONSTRAINT "MemberReferral_firstBookingId_fkey" FOREIGN KEY ("firstBookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

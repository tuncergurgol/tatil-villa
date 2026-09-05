-- Misafir yorum daveti ve moderasyon alanları
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "googleReviewUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "guestReviewInvitesEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "GuestReview" ADD COLUMN IF NOT EXISTS "bookingId" TEXT;
ALTER TABLE "GuestReview" ADD COLUMN IF NOT EXISTS "invitationId" TEXT;
ALTER TABLE "GuestReview" ADD COLUMN IF NOT EXISTS "rejectedReason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "GuestReview" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "GuestReview_bookingId_key" ON "GuestReview"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "GuestReview_invitationId_key" ON "GuestReview"("invitationId");
CREATE INDEX IF NOT EXISTS "GuestReview_approved_createdAt_idx" ON "GuestReview"("approved", "createdAt");

CREATE TABLE IF NOT EXISTS "GuestReviewInvitation" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "emailSentAt" TIMESTAMP(3),
    "whatsappSentAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestReviewInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GuestReviewInvitation_bookingId_key" ON "GuestReviewInvitation"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "GuestReviewInvitation_token_key" ON "GuestReviewInvitation"("token");
CREATE INDEX IF NOT EXISTS "GuestReviewInvitation_token_idx" ON "GuestReviewInvitation"("token");
CREATE INDEX IF NOT EXISTS "GuestReviewInvitation_expiresAt_idx" ON "GuestReviewInvitation"("expiresAt");
CREATE INDEX IF NOT EXISTS "GuestReviewInvitation_usedAt_idx" ON "GuestReviewInvitation"("usedAt");

ALTER TABLE "GuestReviewInvitation" DROP CONSTRAINT IF EXISTS "GuestReviewInvitation_bookingId_fkey";
ALTER TABLE "GuestReviewInvitation" ADD CONSTRAINT "GuestReviewInvitation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuestReview" DROP CONSTRAINT IF EXISTS "GuestReview_bookingId_fkey";
ALTER TABLE "GuestReview" ADD CONSTRAINT "GuestReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GuestReview" DROP CONSTRAINT IF EXISTS "GuestReview_invitationId_fkey";
ALTER TABLE "GuestReview" ADD CONSTRAINT "GuestReview_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "GuestReviewInvitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

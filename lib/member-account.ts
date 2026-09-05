import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  findCustomerForBookingGuest,
  upsertCustomerFromBooking,
} from "@/lib/customer-from-booking";
import { LOYALTY_RULES } from "@/lib/loyalty-config";
import {
  higherLoyaltyTier,
  recognizeReturningGuest,
} from "@/lib/returning-guest";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeMemberEmail(value: string) {
  return value.trim().toLowerCase();
}

export function generateInviteCode(length = 8) {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += INVITE_ALPHABET[bytes[i]! % INVITE_ALPHABET.length];
  }
  return code;
}

export async function generateUniqueInviteCode() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const inviteCode = generateInviteCode();
    const existing = await prisma.memberAccount.findUnique({
      where: { inviteCode },
      select: { id: true },
    });
    if (!existing) return inviteCode;
  }
  throw new Error("Davet kodu üretilemedi");
}

export async function syncMemberLoyaltyFromHistory(memberId: string) {
  const member = await prisma.memberAccount.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      phone: true,
      email: true,
      completedStays: true,
      loyaltyTier: true,
    },
  });
  if (!member) return null;

  const match = await recognizeReturningGuest({
    phone: member.phone,
    email: member.email,
  });
  const stayCount = Math.max(match?.stayCount ?? 0, member.completedStays);
  const loyaltyTier = higherLoyaltyTier(
    member.loyaltyTier,
    match?.loyaltyTier ?? member.loyaltyTier
  );

  if (
    stayCount === member.completedStays &&
    loyaltyTier === member.loyaltyTier
  ) {
    return member;
  }

  return prisma.memberAccount.update({
    where: { id: member.id },
    data: {
      completedStays: stayCount,
      loyaltyTier,
    },
  });
}

export async function createMemberAccountWithLoyalty(input: {
  fullName: string;
  phone: string;
  email: string;
  passwordHash?: string;
  inviteCode: string;
  referredByMemberId?: string;
  marketingConsent?: boolean;
  kvkkAcceptedAt?: Date | null;
  membershipAcceptedAt?: Date | null;
  phoneVerifiedAt?: Date | null;
  registeredSiteKey: string;
}) {
  const match = await recognizeReturningGuest({
    phone: input.phone,
    email: input.email,
  });

  return prisma.memberAccount.create({
    data: {
      fullName: input.fullName.trim() || match?.fullName || "Misafir",
      phone: input.phone,
      email: normalizeMemberEmail(input.email),
      passwordHash: input.passwordHash ?? "",
      inviteCode: input.inviteCode,
      referredByMemberId: input.referredByMemberId,
      marketingConsent: Boolean(input.marketingConsent),
      kvkkAcceptedAt: input.kvkkAcceptedAt ?? undefined,
      membershipAcceptedAt: input.membershipAcceptedAt ?? undefined,
      phoneVerifiedAt: input.phoneVerifiedAt ?? undefined,
      registeredSiteKey: input.registeredSiteKey,
      loyaltyTier: match?.loyaltyTier ?? "BRONZE",
      completedStays: match?.stayCount ?? 0,
    },
  });
}

export async function linkMemberToCustomer(memberId: string) {
  const member = await prisma.memberAccount.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      customerId: true,
    },
  });
  if (!member) return null;

  let customerId = member.customerId;
  if (!customerId) {
    const existingCustomer = await findCustomerForBookingGuest({
      guestName: member.fullName,
      guestPhone: member.phone,
      guestEmail: member.email,
    });

    const result = existingCustomer
      ? { created: false, id: existingCustomer.id }
      : await upsertCustomerFromBooking({
          guestName: member.fullName,
          guestPhone: member.phone,
          guestEmail: member.email,
        });
    if (result) {
      customerId = result.id;
      await prisma.memberAccount.update({
        where: { id: member.id },
        data: { customerId },
      });
    }
  }

  await syncMemberLoyaltyFromHistory(member.id);
  return customerId;
}

export async function findMemberBookings(member: {
  id: string;
  phone: string;
  email: string;
}) {
  const phone = member.phone.trim();
  const email = normalizeMemberEmail(member.email);

  const where: Prisma.BookingWhereInput = {
    OR: [{ memberId: member.id }],
  };

  if (phone) {
    where.OR!.push({ guestPhone: phone });
  }
  if (email) {
    where.OR!.push({ guestEmail: { equals: email, mode: "insensitive" } });
  }

  return prisma.booking.findMany({
    where,
    orderBy: [{ checkIn: "desc" }],
    include: {
      villa: {
        select: {
          name: true,
          slug: true,
          image: true,
        },
      },
    },
  });
}

export async function ensureWelcomeCouponForMember(memberId: string) {
  const member = await prisma.memberAccount.findUnique({
    where: { id: memberId },
    select: { id: true, referredByMemberId: true },
  });
  if (!member?.referredByMemberId) return;

  const code = `HOSGELDIN-${member.id.slice(-6).toUpperCase()}`;
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) return existing;

  const validTo = new Date();
  validTo.setFullYear(validTo.getFullYear() + 1);

  return prisma.coupon.create({
    data: {
      code,
      discountType: "FIXED",
      discountValue: LOYALTY_RULES.welcomeReferralDiscount,
      minBookingMultiplier: LOYALTY_RULES.minBookingMultiplier,
      welcomeCoupon: true,
      referralCoupon: true,
      memberOnly: true,
      validTo,
      active: true,
    },
  });
}

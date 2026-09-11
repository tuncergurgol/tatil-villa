import { prisma } from "@/lib/db";
import { findCustomerForBookingGuest } from "@/lib/customer-from-booking";
import { normalizeMemberEmail } from "@/lib/member-account";
import { normalizePhoneToE164 } from "@/lib/phone";
import { normalizeStoredTurkishPhone } from "@/lib/phone-utils";

export type MemberContactProfile = {
  fullName: string;
  email: string;
  phone: string;
  customerId: string | null;
};

/**
 * Üye hesabını CRM müşteri kaydıyla birleştirir.
 * Eşleşme: telefon → e-posta → ad (findCustomerForBookingGuest).
 * Google OAuth yok; "kişi" = admin Müşteri Yönetimi kaydı.
 */
export async function resolveMemberContactProfile(
  memberId: string
): Promise<MemberContactProfile | null> {
  const member = await prisma.memberAccount.findUnique({
    where: { id: memberId },
    include: { customer: true },
  });
  if (!member) return null;

  let customer = member.customer;
  if (!customer) {
    const matched = await findCustomerForBookingGuest({
      guestName: member.fullName,
      guestPhone: member.phone,
      guestEmail: member.email,
    });
    if (matched) {
      customer = matched;
      await prisma.memberAccount.update({
        where: { id: member.id },
        data: { customerId: matched.id },
      });
    }
  }

  const phone =
    normalizePhoneToE164(member.phone) ||
    normalizePhoneToE164(customer?.phone ?? "") ||
    member.phone;
  const storedPhone = normalizeStoredTurkishPhone(phone) || phone;

  return {
    fullName: (member.fullName || customer?.fullName || "").trim(),
    email: normalizeMemberEmail(member.email || customer?.email || ""),
    phone: storedPhone,
    customerId: customer?.id ?? member.customerId ?? null,
  };
}

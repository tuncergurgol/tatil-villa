import { prisma } from "@/lib/db";
import { normalizeGuestEmail } from "@/lib/booking-guest-contact";
import {
  normalizeStoredTurkishPhone,
  normalizeTurkishPhoneDigits,
} from "@/lib/phone-utils";
import { CRM_CONTACT_CHANNEL_IDS, CRM_TAG_NAMES } from "@/lib/customer-crm-channels";

export type CustomerCrmUpsertInput = {
  fullName: string;
  phone: string;
  email?: string;
  contactChannelId: string;
  firstContactAt?: Date;
};

export type CustomerCrmUpsertResult = {
  created: boolean;
  id: string;
};

function normalizeEmail(email?: string): string {
  if (!email?.trim()) return "";
  return normalizeGuestEmail(email) ?? email.trim().toLowerCase();
}

export async function findCustomerByPhone(phone: string) {
  const stored = normalizeStoredTurkishPhone(phone);
  const digits = normalizeTurkishPhoneDigits(phone);
  if (!digits || digits.length < 10) return null;

  return prisma.customer.findFirst({
    where: {
      OR: [{ phone: stored }, { phone: { endsWith: digits } }],
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Telefon numarasına göre müşteri oluşturur veya mevcut kaydı günceller.
 * İlk ulaşım kanalı ve ilk kayıt zamanı yalnızca yeni kayıtta set edilir.
 */
export async function upsertCustomerByPhone(
  input: CustomerCrmUpsertInput
): Promise<CustomerCrmUpsertResult | null> {
  const phone = normalizeStoredTurkishPhone(input.phone);
  const digits = normalizeTurkishPhoneDigits(input.phone);
  if (!phone || digits.length < 10) return null;

  const fullName = input.fullName.trim() || "Misafir";
  const email = normalizeEmail(input.email);
  const firstContactAt = input.firstContactAt ?? new Date();

  const existing = await findCustomerByPhone(phone);

  if (existing) {
    const updated = await prisma.customer.update({
      where: { id: existing.id },
      data: {
        fullName: fullName || existing.fullName,
        phone: phone || existing.phone,
        email: email || existing.email,
        active: true,
      },
    });
    return { created: false, id: updated.id };
  }

  const created = await prisma.customer.create({
    data: {
      fullName,
      phone,
      email,
      contactChannelId: input.contactChannelId,
      firstContactAt,
      active: true,
    },
  });

  return { created: true, id: created.id };
}

export async function ensureCustomerTag(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  return prisma.customerTag.upsert({
    where: { name: trimmed },
    create: { name: trimmed },
    update: { active: true },
  });
}

export async function assignCustomerTags(
  customerId: string,
  tagNames: string[]
): Promise<void> {
  const uniqueNames = [...new Set(tagNames.map((name) => name.trim()).filter(Boolean))];
  if (uniqueNames.length === 0) return;

  const tags = await Promise.all(uniqueNames.map((name) => ensureCustomerTag(name)));
  const tagIds = tags.filter((tag) => tag != null).map((tag) => tag.id);

  if (tagIds.length === 0) return;

  await prisma.customerTagOnCustomer.createMany({
    data: tagIds.map((tagId) => ({ customerId, tagId })),
    skipDuplicates: true,
  });
}

/**
 * Konaklama sezonu: 01.11.(Y-1) – 31.10.Y → etiket adı Y (ör. 2018).
 */
export function getSeasonTagNameForCheckIn(checkIn: Date | string): string | null {
  const date = typeof checkIn === "string" ? new Date(checkIn) : checkIn;
  if (Number.isNaN(date.getTime())) return null;

  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();
  const seasonYear = month >= 10 ? year + 1 : year;

  if (seasonYear < 2018 || seasonYear > 2026) return null;
  return String(seasonYear);
}

export async function assignConfirmedBookingCustomerTags(input: {
  customerId: string;
  checkIn: Date | string;
}): Promise<void> {
  const tagNames: string[] = [CRM_TAG_NAMES.KONAKLAMA];
  const seasonTag = getSeasonTagNameForCheckIn(input.checkIn);
  if (seasonTag) tagNames.push(seasonTag);

  await assignCustomerTags(input.customerId, tagNames);
}

export async function syncCustomerFromBookingGuest(input: {
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  firstContactAt?: Date;
  assignConfirmedTags?: boolean;
  checkIn?: Date | string;
}): Promise<CustomerCrmUpsertResult | null> {
  const phone = input.guestPhone?.trim() ?? "";
  if (!phone) return null;

  const result = await upsertCustomerByPhone({
    fullName: input.guestName,
    phone,
    email: input.guestEmail,
    contactChannelId: CRM_CONTACT_CHANNEL_IDS.REZERVASYON,
    firstContactAt: input.firstContactAt,
  });

  if (result && input.assignConfirmedTags && input.checkIn) {
    await assignConfirmedBookingCustomerTags({
      customerId: result.id,
      checkIn: input.checkIn,
    });
  }

  return result;
}

export async function syncCustomerFromCallback(input: {
  name: string;
  phone: string;
  firstContactAt?: Date;
}): Promise<CustomerCrmUpsertResult | null> {
  return upsertCustomerByPhone({
    fullName: input.name,
    phone: input.phone,
    contactChannelId: CRM_CONTACT_CHANNEL_IDS.SIZI_ARAYALIM,
    firstContactAt: input.firstContactAt,
  });
}

export async function syncCustomerFromFacebookLead(input: {
  fullName: string;
  phone: string;
  email?: string;
  firstContactAt?: Date;
}): Promise<CustomerCrmUpsertResult | null> {
  return upsertCustomerByPhone({
    fullName: input.fullName || "Facebook Lead",
    phone: input.phone,
    email: input.email,
    contactChannelId: CRM_CONTACT_CHANNEL_IDS.FACEBOOK_LEAD,
    firstContactAt: input.firstContactAt,
  });
}

export async function syncCustomerFromAvailabilitySearch(input: {
  guestName: string;
  phone: string;
  guestEmail?: string;
  contactChannelId?: string;
  firstContactAt?: Date;
}): Promise<CustomerCrmUpsertResult | null> {
  return upsertCustomerByPhone({
    fullName: input.guestName,
    phone: input.phone,
    email: input.guestEmail,
    contactChannelId:
      input.contactChannelId?.trim() || CRM_CONTACT_CHANNEL_IDS.UYGUNLUK_ARA,
    firstContactAt: input.firstContactAt,
  });
}

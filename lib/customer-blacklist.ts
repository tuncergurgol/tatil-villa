import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  assignCustomerTags,
  findCustomerByPhone,
} from "@/lib/customer-crm";
import { CRM_TAG_NAMES } from "@/lib/customer-crm-channels";
import { normalizeGuestEmail } from "@/lib/booking-guest-contact";
import {
  normalizeStoredTurkishPhone,
  normalizeTurkishPhoneDigits,
} from "@/lib/phone-utils";

export const CUSTOMER_BLACKLIST_PUBLIC_MESSAGE =
  "Bu iletişim bilgileri ile talep alınamıyor.";

export async function isBlacklistedContact(input: {
  phone?: string | null;
  email?: string | null;
}): Promise<boolean> {
  const digits = input.phone ? normalizeTurkishPhoneDigits(input.phone) : "";
  const email = input.email?.trim()
    ? normalizeGuestEmail(input.email) ?? input.email.trim().toLowerCase()
    : "";

  const or: Prisma.CustomerWhereInput[] = [];
  if (digits.length >= 10) {
    or.push({ phone: { endsWith: digits } });
  }
  if (email) {
    or.push({ email: { equals: email, mode: "insensitive" } });
  }
  if (or.length === 0) return false;

  const found = await prisma.customer.findFirst({
    where: {
      blacklisted: true,
      OR: or,
    },
    select: { id: true },
  });

  return Boolean(found);
}

async function revokeMarketingConsent(phone: string) {
  const digits = normalizeTurkishPhoneDigits(phone);
  if (digits.length < 10) return;

  await prisma.memberAccount.updateMany({
    where: {
      OR: [{ phone: { endsWith: digits } }, { phone: { contains: digits } }],
    },
    data: { marketingConsent: false },
  });
}

async function removeBlacklistTag(customerId: string) {
  const tag = await prisma.customerTag.findUnique({
    where: { name: CRM_TAG_NAMES.KARA_LISTE },
    select: { id: true },
  });
  if (!tag) return;

  await prisma.customerTagOnCustomer.deleteMany({
    where: { customerId, tagId: tag.id },
  });
}

export async function setCustomerBlacklist(
  customerId: string,
  blacklisted: boolean
) {
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { blacklisted },
    select: { id: true, phone: true },
  });

  if (blacklisted) {
    await assignCustomerTags(customer.id, [CRM_TAG_NAMES.KARA_LISTE]);
    if (customer.phone) await revokeMarketingConsent(customer.phone);
    return;
  }

  await removeBlacklistTag(customer.id);
}

/**
 * Telefon müşteri listesinde yoksa kayıt açar ve KARA LİSTE etiketini yazar.
 * Varsa mevcut adı korur, yalnızca kara liste işaretini açar.
 */
export async function upsertBlacklistedCustomer(input: {
  phone: string;
  fullName?: string;
}) {
  const phone = normalizeStoredTurkishPhone(input.phone);
  const digits = normalizeTurkishPhoneDigits(input.phone);
  if (!phone || digits.length < 10) {
    throw new Error("Geçerli bir telefon gerekli");
  }

  const existing = await findCustomerByPhone(phone);
  const customer = existing
    ? await prisma.customer.update({
        where: { id: existing.id },
        data: {
          phone: phone || existing.phone,
          blacklisted: true,
        },
        select: { id: true, fullName: true, phone: true },
      })
    : await prisma.customer.create({
        data: {
          fullName: input.fullName?.trim() || "Kara Liste",
          phone,
          blacklisted: true,
          active: true,
        },
        select: { id: true, fullName: true, phone: true },
      });

  await assignCustomerTags(customer.id, [CRM_TAG_NAMES.KARA_LISTE]);
  await revokeMarketingConsent(customer.phone);
  return customer;
}

import { prisma } from "@/lib/db";
import {
  buildGuestDedupKey,
  pickBestEmail,
  pickBestPhone,
  resolveGuestContact,
  type ResolvedGuestContact,
} from "@/lib/booking-guest-contact";
import { readBookingRowsFromFileAuto } from "@/lib/booking-excel-import";
import {
  normalizeStoredTurkishPhone,
  normalizeTurkishPhoneDigits,
} from "@/lib/phone-utils";

export type BookingGuestInput = {
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  contactChannelId?: string | null;
};

export { isImportedPlaceholderEmail } from "@/lib/booking-guest-contact";

export async function findCustomerForBookingGuest(input: BookingGuestInput) {
  const contact = resolveGuestContact(input);
  if (!contact) return null;

  const digits = normalizeTurkishPhoneDigits(contact.phone);
  if (digits.length === 10) {
    const stored = normalizeStoredTurkishPhone(contact.phone);
    const byPhone = await prisma.customer.findFirst({
      where: {
        OR: [{ phone: stored }, { phone: { endsWith: digits } }],
      },
      orderBy: { updatedAt: "desc" },
    });
    if (byPhone) return byPhone;
  }

  if (contact.email) {
    const byEmail = await prisma.customer.findFirst({
      where: { email: { equals: contact.email, mode: "insensitive" } },
      orderBy: { updatedAt: "desc" },
    });
    if (byEmail) return byEmail;
  }

  const byName = await prisma.customer.findFirst({
    where: {
      fullName: { equals: contact.fullName, mode: "insensitive" },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (byName) return byName;

  return null;
}

function mergeContact(
  existing: { phone: string; email: string },
  incoming: ResolvedGuestContact
) {
  return {
    phone: incoming.phone || existing.phone,
    email: incoming.email || existing.email,
  };
}

export async function upsertCustomerFromBooking(
  input: BookingGuestInput
): Promise<{ created: boolean; id: string } | null> {
  const contact = resolveGuestContact(input);
  if (!contact) return null;

  const existing = await findCustomerForBookingGuest(input);

  if (existing) {
    const merged = mergeContact(existing, contact);
    const updated = await prisma.customer.update({
      where: { id: existing.id },
      data: {
        fullName: contact.fullName,
        phone: merged.phone,
        email: merged.email,
        contactChannelId:
          input.contactChannelId ?? existing.contactChannelId ?? null,
        active: true,
      },
    });
    return { created: false, id: updated.id };
  }

  const created = await prisma.customer.create({
    data: {
      fullName: contact.fullName,
      phone: contact.phone,
      email: contact.email,
      contactChannelId: input.contactChannelId ?? null,
      active: true,
    },
  });

  return { created: true, id: created.id };
}

export async function syncAllCustomersFromBookings() {
  const bookings = await prisma.booking.findMany({
    orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
    select: {
      guestName: true,
      guestEmail: true,
      guestPhone: true,
    },
  });

  const grouped = new Map<
    string,
    {
      fullName: string;
      phones: string[];
      emails: string[];
    }
  >();

  for (const booking of bookings) {
    const contact = resolveGuestContact(booking);
    if (!contact) continue;

    const key = buildGuestDedupKey(contact);
    const bucket = grouped.get(key) ?? {
      fullName: contact.fullName,
      phones: [],
      emails: [],
    };

    bucket.fullName = contact.fullName;
    bucket.phones.push(booking.guestPhone ?? "");
    bucket.emails.push(booking.guestEmail ?? "");
    grouped.set(key, bucket);
  }

  let created = 0;
  let updated = 0;

  for (const bucket of grouped.values()) {
    const result = await upsertCustomerFromBooking({
      guestName: bucket.fullName,
      guestPhone: pickBestPhone(bucket.phones),
      guestEmail: pickBestEmail(bucket.emails),
    });
    if (!result) continue;
    if (result.created) created += 1;
    else updated += 1;
  }

  const total = await prisma.customer.count();

  return {
    bookingsProcessed: bookings.length,
    uniqueGuests: grouped.size,
    created,
    updated,
    totalCustomers: total,
  };
}

export async function syncAllCustomersFromExcel(filePath: string) {
  const { parsed } = readBookingRowsFromFileAuto(filePath);
  const rows = parsed.rows;

  const grouped = new Map<
    string,
    {
      fullName: string;
      phones: string[];
      emails: string[];
    }
  >();

  for (const row of rows) {
    const contact = resolveGuestContact(row);
    if (!contact) continue;

    const key = buildGuestDedupKey(contact);
    const bucket = grouped.get(key) ?? {
      fullName: contact.fullName,
      phones: [],
      emails: [],
    };

    bucket.fullName = contact.fullName;
    bucket.phones.push(row.guestPhone ?? "");
    bucket.emails.push(row.guestEmail ?? "");
    grouped.set(key, bucket);
  }

  let created = 0;
  let updated = 0;
  let withPhone = 0;
  let withEmail = 0;

  for (const bucket of grouped.values()) {
    const guestPhone = pickBestPhone(bucket.phones);
    const guestEmail = pickBestEmail(bucket.emails);
    if (guestPhone) withPhone += 1;
    if (guestEmail) withEmail += 1;

    const result = await upsertCustomerFromBooking({
      guestName: bucket.fullName,
      guestPhone,
      guestEmail,
    });
    if (!result) continue;
    if (result.created) created += 1;
    else updated += 1;
  }

  const total = await prisma.customer.count();

  return {
    rowsProcessed: rows.length,
    uniqueGuests: grouped.size,
    created,
    updated,
    withPhone,
    withEmail,
    totalCustomers: total,
  };
}

import { BookingStatus, type Prisma } from "@prisma/client";
import { isImportedPlaceholderEmail } from "@/lib/booking-guest-contact";
import { prisma } from "@/lib/db";
import {
  defaultDetailsFromBooking,
  formatGuestFullName,
  resolveExternalCode,
  type BookingDetails,
  type BookingGuestEntry,
} from "@/lib/booking-form-details";
import { calculateNights } from "@/lib/stay-nights";

const confirmationInclude = {
  villa: { select: { name: true, slug: true, image: true, images: true } },
  prepayments: { select: { amount: true } },
} satisfies Prisma.BookingInclude;

type ConfirmationBookingRow = Prisma.BookingGetPayload<{
  include: typeof confirmationInclude;
}>;

/** rezId: rezervasyon no (116004), booking id (cuid) veya eski kısa kod (id son 5). */
async function findBookingForPublicConfirmation(
  rezId: string
): Promise<ConfirmationBookingRow | null> {
  const numericCode = Number.parseInt(rezId, 10);
  if (Number.isFinite(numericCode) && String(numericCode) === rezId) {
    const byExternal = await prisma.booking.findFirst({
      where: { externalCode: numericCode },
      include: confirmationInclude,
    });
    if (byExternal) return byExternal;
  }

  const byId = await prisma.booking.findFirst({
    where: { id: rezId },
    include: confirmationInclude,
  });
  if (byId) return byId;

  // Eski ONAYLINK / kısa kod: cuid son 4–8 karakter (örn. id.slice(-5).toUpperCase())
  if (/^[A-Za-z0-9]{4,8}$/.test(rezId) && !/^\d+$/.test(rezId)) {
    const suffix = rezId.toLowerCase();
    const candidates = await prisma.booking.findMany({
      where: { id: { endsWith: suffix } },
      include: confirmationInclude,
      take: 2,
    });
    if (candidates.length === 1) return candidates[0]!;
  }

  return null;
}

function emailsMatchForConfirmation(
  bookingEmailRaw: string,
  queryMailRaw: string
): boolean {
  const mail = queryMailRaw.trim().toLowerCase();
  if (!mail) return true;

  // Import placeholder e-posta gerçek misafir maili değil; katı eşleme yapılamaz
  if (isImportedPlaceholderEmail(bookingEmailRaw)) {
    return true;
  }

  return bookingEmailRaw.trim().toLowerCase() === mail;
}

export type PublicConfirmationGuest = BookingGuestEntry & {
  fullName: string;
};

export type PublicConfirmationBooking = {
  id: string;
  rezId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  status: BookingStatus;
  alreadyConfirmed: boolean;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  adults: number;
  children: number;
  babies: number;
  pets: number;
  totalGuests: number;
  totalPrice: number | null;
  prepaymentAmount: number;
  villaName: string;
  villaImage: string | null;
  villaSlug: string;
  guests: PublicConfirmationGuest[];
  details: BookingDetails;
};

function splitGuestName(fullName: string): { name: string; surname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name: "", surname: "" };
  if (parts.length === 1) return { name: parts[0], surname: "" };
  return { name: parts.slice(0, -1).join(" "), surname: parts[parts.length - 1]! };
}

function guestFullName(guest: BookingGuestEntry): string {
  return formatGuestFullName(guest);
}

function buildInitialGuests(input: {
  adults: number;
  children: number;
  babies: number;
  guestName: string;
  details: BookingDetails;
}): PublicConfirmationGuest[] {
  const adultRows = input.details.adultGuests ?? [];
  const childRows = input.details.childGuests ?? [];
  const babyRows = input.details.babyGuests ?? [];
  const total =
    Math.max(1, input.adults) +
    Math.max(0, input.children) +
    Math.max(0, input.babies);

  const rows: BookingGuestEntry[] = [];
  for (let i = 0; i < Math.max(1, input.adults); i++) {
    rows.push(
      adultRows[i] ?? {
        name: "",
        surname: "",
        nationalId: "",
        plate: "",
        gender: "",
        nationality: "TC",
      }
    );
  }
  for (let i = 0; i < Math.max(0, input.children); i++) {
    rows.push(
      childRows[i] ?? {
        name: "",
        surname: "",
        nationalId: "",
        plate: "",
        gender: "",
        nationality: "TC",
      }
    );
  }
  for (let i = 0; i < Math.max(0, input.babies); i++) {
    rows.push(
      babyRows[i] ?? {
        name: "",
        surname: "",
        nationalId: "",
        plate: "",
        gender: "",
        nationality: "TC",
      }
    );
  }

  while (rows.length < total) {
    rows.push({
      name: "",
      surname: "",
      nationalId: "",
      plate: "",
      gender: "",
      nationality: "TC",
    });
  }

  const primary = rows[0];
  if (primary && !guestFullName(primary) && input.guestName.trim()) {
    const split = splitGuestName(input.guestName);
    primary.name = split.name;
    primary.surname = split.surname;
  }
  if (primary && !primary.nationalId && input.details.guestTc) {
    primary.nationalId = input.details.guestTc;
  }

  return rows.slice(0, total).map((guest) => ({
    ...guest,
    surname: guest.surname ?? "",
    gender: guest.gender ?? "",
    nationality: guest.nationality || "TC",
    fullName: guestFullName(guest),
  }));
}

export async function getBookingForPublicConfirmation(input: {
  rezId: string;
  mail?: string | null;
}): Promise<
  | { ok: true; booking: PublicConfirmationBooking }
  | { ok: false; error: string }
> {
  const rezId = input.rezId.trim();
  if (!rezId) {
    return { ok: false, error: "Rezervasyon kodu gerekli." };
  }

  const booking = await findBookingForPublicConfirmation(rezId);
  if (!booking) {
    return { ok: false, error: "Rezervasyon bulunamadı." };
  }

  const resolvedCode = resolveExternalCode(
    booking.externalCode,
    booking.guestEmail
  );

  if (!emailsMatchForConfirmation(booking.guestEmail, input.mail ?? "")) {
    return {
      ok: false,
      error: "Rezervasyon kodu ile e-posta eşleşmiyor.",
    };
  }

  if (
    booking.status === BookingStatus.CANCELLED ||
    booking.status === BookingStatus.COMPENSATION
  ) {
    return {
      ok: false,
      error: "Bu rezervasyon için onay işlemi yapılamaz.",
    };
  }

  const details = defaultDetailsFromBooking(booking);
  const prepaymentAmount = booking.prepayments.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const guests = buildInitialGuests({
    adults: booking.adults,
    children: booking.children,
    babies: booking.babies,
    guestName: booking.guestName,
    details,
  });

  return {
    ok: true,
    booking: {
      id: booking.id,
      rezId: resolvedCode || rezId,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
      status: booking.status,
      alreadyConfirmed: booking.status === BookingStatus.CONFIRMED,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      nights,
      adults: booking.adults,
      children: booking.children,
      babies: booking.babies,
      pets: booking.pets,
      totalGuests: guests.length,
      totalPrice: booking.totalPrice,
      prepaymentAmount:
        prepaymentAmount > 0
          ? prepaymentAmount
          : (details.prepaymentAmount ?? 0),
      villaName: booking.villa.name,
      villaImage: booking.villa.images[0] ?? booking.villa.image ?? null,
      villaSlug: booking.villa.slug,
      guests,
      details,
    },
  };
}

import { BookingStatus, type Prisma } from "@prisma/client";
import {
  applyAddressMask,
  applyPiiMask,
  getCheckInPiiVisibility,
} from "@/lib/check-in-info-mask";
import { prisma } from "@/lib/db";
import {
  BOOKING_EXTRA_FEE_FIELDS,
  computeGuestReservationTotal,
  defaultDetailsFromBooking,
  formatGuestFullName,
  resolveExternalCode,
  type BookingDetails,
  type BookingGuestEntry,
} from "@/lib/booking-form-details";
import { calculateNights } from "@/lib/queries/bookings";
import { formatMoneyPlain } from "@/lib/booking-display";
import { formatVillaRegionLabelMahalleIlceIl } from "@/lib/queries/villa-location";

const checkInInfoInclude = {
  villa: {
    select: {
      name: true,
      slug: true,
      image: true,
      images: true,
      location: true,
      bedrooms: true,
      bathrooms: true,
      guests: true,
      description: true,
      amenities: true,
      checkInTime: true,
      checkOutTime: true,
      documentAddress: true,
      greeterName: true,
      greeterPhone: true,
      region: {
        select: {
          name: true,
          parent: {
            select: {
              name: true,
              parent: { select: { name: true } },
            },
          },
        },
      },
      owner: {
        select: {
          name: true,
          phone: true,
          email: true,
          authorizedPersonName: true,
        },
      },
    },
  },
  prepayments: { select: { amount: true } },
} satisfies Prisma.BookingInclude;

type CheckInInfoBookingRow = Prisma.BookingGetPayload<{
  include: typeof checkInInfoInclude;
}>;

/** rezervasyon no / cuid / kısa kod — onay resolve ile aynı mantık */
async function findBookingForCheckInInfo(
  code: string
): Promise<CheckInInfoBookingRow | null> {
  const numericCode = Number.parseInt(code, 10);
  if (Number.isFinite(numericCode) && String(numericCode) === code) {
    const byExternal = await prisma.booking.findFirst({
      where: { externalCode: numericCode },
      include: checkInInfoInclude,
    });
    if (byExternal) return byExternal;
  }

  const byId = await prisma.booking.findFirst({
    where: { id: code },
    include: checkInInfoInclude,
  });
  if (byId) return byId;

  if (/^[A-Za-z0-9]{4,8}$/.test(code) && !/^\d+$/.test(code)) {
    const suffix = code.toLowerCase();
    const candidates = await prisma.booking.findMany({
      where: { id: { endsWith: suffix } },
      include: checkInInfoInclude,
      take: 2,
    });
    if (candidates.length === 1) return candidates[0]!;
  }

  return null;
}

function guestFullName(guest: BookingGuestEntry): string {
  return formatGuestFullName(guest);
}

function guestRoleLabel(
  index: number,
  adults: number,
  children: number
): string {
  if (index < adults) return "Yetişkin";
  if (index < adults + children) return "Çocuk";
  return "Bebek";
}

export type CheckInInfoAudience = "guest" | "owner";

export type CheckInInfoStayGuest = {
  fullName: string;
  nationalId: string;
  role: string;
};

export type CheckInInfoContact = {
  displayName: string;
  phone: string;
  email: string;
  /** Ham telefon yalnızca reveal + aksiyon için (sayfada gösterilmez ayri) */
  phoneForActions: string | null;
};

export type CheckInInfoInvoice = {
  taxpayerType: string;
  title: string;
  taxOffice: string;
  taxNumber: string;
  address: string;
  city: string;
  district: string;
  country: string;
};

export type CheckInInfoPaymentLine = {
  label: string;
  amountLabel: string;
};

export type PublicCheckInInfoPage = {
  audience: CheckInInfoAudience;
  code: string;
  revealed: boolean;
  villaName: string;
  villaLocation: string;
  villaImage: string | null;
  villaSlug: string;
  bedrooms: number;
  bathrooms: number;
  capacity: number;
  nights: number;
  amenities: string[];
  description: string;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  checkInLabel: string;
  checkOutLabel: string;
  checkInWeekdayLabel: string;
  checkOutWeekdayLabel: string;
  totalGuests: number;
  primaryGuestName: string;
  villaAddress: string;
  greeter: CheckInInfoContact;
  guestContact: CheckInInfoContact;
  stayGuests: CheckInInfoStayGuest[];
  invoice: CheckInInfoInvoice | null;
  /** Rezervasyon Hesabı satırları (yalnızca tutar > 0) */
  accountLines: CheckInInfoPaymentLine[];
  /** Toplam */
  accountSummaryLines: CheckInInfoPaymentLine[];
  paymentLines: CheckInInfoPaymentLine[];
  ownerPaymentLines: CheckInInfoPaymentLine[];
  contactActionsEnabled: boolean;
};

function formatTrDay(date: Date): string {
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTrWeekday(date: Date): string {
  return date.toLocaleDateString("tr-TR", {
    weekday: "long",
    timeZone: "UTC",
  });
}

function resolveGreeterRaw(villa: CheckInInfoBookingRow["villa"]): {
  name: string;
  phone: string;
  email: string;
} {
  const greeterName = villa.greeterName.trim();
  const greeterPhone = villa.greeterPhone.trim();
  if (greeterName || greeterPhone) {
    return {
      name: greeterName || villa.owner?.authorizedPersonName || villa.owner?.name || "Ev sahibi / Görevli",
      phone: greeterPhone || villa.owner?.phone || "",
      email: villa.owner?.email || "",
    };
  }
  return {
    name:
      villa.owner?.authorizedPersonName?.trim() ||
      villa.owner?.name?.trim() ||
      "Ev sahibi / Görevli",
    phone: villa.owner?.phone?.trim() || "",
    email: villa.owner?.email?.trim() || "",
  };
}

function buildStayGuests(
  booking: CheckInInfoBookingRow,
  details: BookingDetails,
  revealed: boolean
): CheckInInfoStayGuest[] {
  const adultRows = details.adultGuests ?? [];
  const childRows = details.childGuests ?? [];
  const babyRows = details.babyGuests ?? [];
  const rows: BookingGuestEntry[] = [
    ...adultRows.slice(0, Math.max(0, booking.adults)),
    ...childRows.slice(0, Math.max(0, booking.children)),
    ...babyRows.slice(0, Math.max(0, booking.babies)),
  ];

  if (rows.length === 0 && booking.guestName.trim()) {
    rows.push({
      name: booking.guestName,
      surname: "",
      nationalId: details.guestTc ?? "",
      plate: "",
    });
  }

  while (
    rows.length <
    Math.max(1, booking.adults) + booking.children + booking.babies
  ) {
    rows.push({ name: "", surname: "", nationalId: "", plate: "" });
  }

  if (rows[0] && !guestFullName(rows[0]) && booking.guestName.trim()) {
    rows[0] = { ...rows[0], name: booking.guestName };
  }
  if (rows[0] && !rows[0].nationalId && details.guestTc) {
    rows[0] = { ...rows[0], nationalId: details.guestTc };
  }

  return rows.map((guest, index) => {
    const full = guestFullName(guest) || (index === 0 ? booking.guestName : "Misafir");
    return {
      fullName: applyPiiMask(full, revealed),
      nationalId: applyPiiMask(guest.nationalId, revealed),
      role: guestRoleLabel(index, booking.adults, booking.children),
    };
  });
}

function resolveTaxpayerLabel(raw: string | null | undefined): string {
  const value = (raw ?? "").trim().toLocaleLowerCase("tr-TR");
  if (!value) return "Şahıs";
  if (
    value === "corporate" ||
    value === "tuzel" ||
    value === "tüzel" ||
    value === "kurumsal"
  ) {
    return "Kurumsal";
  }
  if (
    value === "individual" ||
    value === "sahis" ||
    value === "şahıs" ||
    value === "gercek" ||
    value === "gerçek"
  ) {
    return "Şahıs";
  }
  return raw!.trim();
}

function buildInvoice(
  details: BookingDetails,
  guestName: string,
  revealed: boolean
): CheckInInfoInvoice | null {
  const hasAny =
    Boolean(details.taxpayerType?.trim()) ||
    Boolean(details.invoiceTitle?.trim()) ||
    Boolean(details.invoiceTaxNumber?.trim()) ||
    Boolean(details.invoiceAddress?.trim()) ||
    Boolean(details.wantsTaxpayerInfo) ||
    Boolean(details.guestTc?.trim());

  if (!hasAny) return null;

  const displayTitle =
    details.invoiceTitle?.trim() || guestName.trim() || "";

  return {
    taxpayerType: resolveTaxpayerLabel(details.taxpayerType),
    title: applyPiiMask(displayTitle, revealed),
    taxOffice: applyPiiMask(details.invoiceTaxOffice, revealed),
    taxNumber: applyPiiMask(
      details.invoiceTaxNumber || details.guestTc,
      revealed
    ),
    address: applyAddressMask(
      details.invoiceAddress || details.guestAddress,
      revealed
    ),
    city: applyPiiMask(details.invoiceCity || details.guestCity, revealed),
    district: applyPiiMask(
      details.invoiceDistrict || details.guestDistrict,
      revealed
    ),
    country: applyPiiMask(
      details.invoiceCountry || details.guestCountry,
      revealed
    ),
  };
}

function buildAccountLines(
  details: BookingDetails,
  nights: number
): CheckInInfoPaymentLine[] {
  const lines: CheckInInfoPaymentLine[] = [];
  const accommodation = details.grossPrice ?? 0;
  if (accommodation > 0) {
    lines.push({
      label: `Konaklama (${nights} Gece)`,
      amountLabel: formatMoneyPlain(accommodation),
    });
  }

  const extraLabels: Partial<
    Record<(typeof BOOKING_EXTRA_FEE_FIELDS)[number]["key"], string>
  > = {
    cleaningFee: "Temizlik",
    petCleaningFee: "Evcil Hayvan Temizlik",
    extraAccommodationFee: "Ek Yatak",
    underfloorHeatingFee: "Yerden Isıtma",
    poolHeatingPrivateFee: "Havuz Isıtma (Özel Havuz)",
    poolHeatingIndoorFee: "Havuz Isıtma (Kapalı Havuz)",
    poolHeatingKidsFee: "Havuz Isıtma (Çocuk Havuzu)",
  };

  for (const { key, label } of BOOKING_EXTRA_FEE_FIELDS) {
    const amount = details[key] ?? 0;
    if (amount > 0) {
      lines.push({
        label: extraLabels[key] ?? label,
        amountLabel: formatMoneyPlain(amount),
      });
    }
  }

  return lines;
}

function buildAccountSummaryLines(
  booking: CheckInInfoBookingRow,
  details: BookingDetails
): CheckInInfoPaymentLine[] {
  const total =
    computeGuestReservationTotal(details) ??
    booking.totalPrice ??
    details.grossPrice ??
    0;

  return [{ label: "Toplam", amountLabel: formatMoneyPlain(total) }];
}

function buildPaymentLines(
  booking: CheckInInfoBookingRow,
  details: BookingDetails,
  prepaymentSum: number
): CheckInInfoPaymentLine[] {
  const total =
    computeGuestReservationTotal(details) ??
    booking.totalPrice ??
    details.grossPrice ??
    0;
  const prepayment =
    prepaymentSum > 0 ? prepaymentSum : (details.prepaymentAmount ?? 0);
  const checkInPayment =
    details.checkInPayment ?? Math.max(0, total - prepayment);

  return [
    { label: "Alınan Ön Ödeme", amountLabel: formatMoneyPlain(prepayment) },
    {
      label: "Girişte Yapılacak Ödeme (Kalan)",
      amountLabel: formatMoneyPlain(checkInPayment),
    },
  ];
}

function formatOwnerPaymentDueDateLabel(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
    if (!Number.isNaN(date.getTime())) return formatTrDay(date);
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return formatTrDay(parsed);
  return value;
}

function buildOwnerPaymentLines(
  details: BookingDetails,
  guestLines: CheckInInfoPaymentLine[]
): CheckInInfoPaymentLine[] {
  const lines: CheckInInfoPaymentLine[] = [...guestLines];
  const agencyExpected = details.agencyExpectedAmount ?? 0;
  if (agencyExpected > 0) {
    lines.push({
      label: "Acenteden Gelecek Ödeme",
      amountLabel: formatMoneyPlain(agencyExpected),
    });
  }

  const ownerPayable = details.ownerPayableAmount ?? 0;
  if (ownerPayable > 0) {
    lines.push({
      label: "Villa Sahibine Ödenecek Para",
      amountLabel: formatMoneyPlain(ownerPayable),
    });
    lines.push({
      label: "Villa Sahibine Ödeme Yapılacak Tarih",
      amountLabel:
        formatOwnerPaymentDueDateLabel(details.ownerPaymentDueDate) || "—",
    });
  }

  return lines;
}

function maskContact(
  name: string,
  phone: string,
  email: string,
  revealed: boolean
): CheckInInfoContact {
  return {
    displayName: applyPiiMask(name, revealed) || "—",
    phone: applyPiiMask(phone, revealed),
    email: applyPiiMask(email, revealed),
    phoneForActions: revealed && phone.trim() ? phone.trim() : null,
  };
}

export async function getPublicCheckInInfo(input: {
  code: string;
  audience: CheckInInfoAudience;
  now?: Date;
}): Promise<
  | { ok: true; page: PublicCheckInInfoPage }
  | { ok: false; error: string }
> {
  const code = input.code.trim();
  if (!code) {
    return { ok: false, error: "Rezervasyon kodu gerekli." };
  }

  const booking = await findBookingForCheckInInfo(code);
  if (!booking) {
    return { ok: false, error: "Rezervasyon bulunamadı." };
  }

  if (
    booking.status === BookingStatus.CANCELLED ||
    booking.status === BookingStatus.COMPENSATION
  ) {
    return {
      ok: false,
      error: "Bu rezervasyon için giriş bilgilendirme görüntülenemez.",
    };
  }

  const details = defaultDetailsFromBooking(booking);
  const visibility = getCheckInPiiVisibility({
    checkInDate: booking.checkIn,
    checkInTime: booking.villa.checkInTime,
    now: input.now,
  });
  const revealed = visibility.revealed;
  const resolvedCode =
    resolveExternalCode(booking.externalCode, booking.guestEmail) || code;

  const prepaymentSum = booking.prepayments.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const greeterRaw = resolveGreeterRaw(booking.villa);
  const accountLines = buildAccountLines(details, nights);
  const accountSummaryLines = buildAccountSummaryLines(booking, details);
  const paymentLines = buildPaymentLines(booking, details, prepaymentSum);
  const ownerPaymentLines = buildOwnerPaymentLines(details, paymentLines);

  const invoice = buildInvoice(details, booking.guestName, revealed);
  const villaLocation = booking.villa.region
    ? formatVillaRegionLabelMahalleIlceIl(booking.villa.region)
    : booking.villa.location;

  const page: PublicCheckInInfoPage = {
    audience: input.audience,
    code: resolvedCode,
    revealed,
    villaName: booking.villa.name,
    villaLocation,
    villaImage: booking.villa.images[0] ?? booking.villa.image ?? null,
    villaSlug: booking.villa.slug,
    bedrooms: booking.villa.bedrooms,
    bathrooms: booking.villa.bathrooms,
    capacity: booking.villa.guests,
    nights,
    amenities: booking.villa.amenities ?? [],
    description: booking.villa.description ?? "",
    checkIn: booking.checkIn.toISOString(),
    checkOut: booking.checkOut.toISOString(),
    checkInTime: booking.villa.checkInTime || "16:00",
    checkOutTime: booking.villa.checkOutTime || "10:00",
    checkInLabel: formatTrDay(booking.checkIn),
    checkOutLabel: formatTrDay(booking.checkOut),
    checkInWeekdayLabel: formatTrWeekday(booking.checkIn),
    checkOutWeekdayLabel: formatTrWeekday(booking.checkOut),
    totalGuests: booking.adults + booking.children + booking.babies,
    primaryGuestName: applyPiiMask(booking.guestName, revealed),
    villaAddress: applyAddressMask(booking.villa.documentAddress, revealed),
    greeter: maskContact(
      greeterRaw.name,
      greeterRaw.phone,
      greeterRaw.email,
      revealed
    ),
    guestContact: maskContact(
      booking.guestName,
      booking.guestPhone,
      booking.guestEmail,
      revealed
    ),
    stayGuests: buildStayGuests(booking, details, revealed),
    invoice,
    accountLines,
    accountSummaryLines,
    paymentLines,
    ownerPaymentLines,
    contactActionsEnabled: revealed,
  };

  return { ok: true, page };
}

import { BookingStatus } from "@prisma/client";
import {
  parseBookingDetails,
  resolveExternalCode,
} from "@/lib/booking-form-details";
import {
  resolveBookingSiteBrand,
  sanitizePublicBookingDomain,
} from "@/lib/booking-site-brand";
import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/queries/company-settings";

export type PublicBookingPaymentPageData = {
  reservationCode: string;
  guestName: string;
  villaName: string;
  amount: number;
  brandName: string;
  brandDomain: string;
  callbackOrigin: string;
  alreadyPaid: boolean;
  paidTotal: number;
  optionExpired: boolean;
  status: BookingStatus;
};

export async function getPublicBookingPaymentPage(
  code: string
): Promise<
  | { ok: true; bookingId: string; page: PublicBookingPaymentPageData }
  | { ok: false; error: string }
> {
  const trimmed = code.trim();
  if (!trimmed) {
    return { ok: false, error: "Geçerli bir rezervasyon numarası gerekli." };
  }

  const numericCode = Number.parseInt(trimmed, 10);
  const booking = await prisma.booking.findFirst({
    where: Number.isFinite(numericCode)
      ? { externalCode: numericCode }
      : { id: trimmed },
    include: {
      villa: { select: { name: true } },
      prepayments: { select: { amount: true } },
    },
  });

  if (!booking) {
    return { ok: false, error: "Rezervasyon bulunamadı." };
  }

  const reservationCode =
    resolveExternalCode(booking.externalCode, booking.guestEmail) || trimmed;

  if (
    booking.status === BookingStatus.CANCELLED ||
    booking.status === BookingStatus.NEW
  ) {
    return {
      ok: false,
      error: "Bu rezervasyon için online ödeme henüz aktif değil.",
    };
  }

  const details = parseBookingDetails(booking.details);
  const amount = Math.round(details.prepaymentAmount ?? 0);
  if (!(amount > 0)) {
    return {
      ok: false,
      error: "Rezervasyon için tanımlı bir ön ödeme tutarı bulunamadı.",
    };
  }

  const paidTotal = booking.prepayments.reduce(
    (sum, row) => sum + row.amount,
    0
  );
  const alreadyPaid = paidTotal >= amount;

  const optionExpired =
    booking.optionExpiresAt != null && booking.optionExpiresAt.getTime() < Date.now();

  if (optionExpired && !alreadyPaid) {
    return {
      ok: false,
      error: "Ödeme opsiyon süresi dolmuş. Lütfen acentenizle iletişime geçin.",
    };
  }

  const company = await getCompanySettings();
  const siteBrand = resolveBookingSiteBrand({
    siteInfo: details.siteInfo,
    originDomain: details.originDomain,
    company,
  });
  const brandDomain = sanitizePublicBookingDomain(siteBrand.domain);
  const callbackOrigin = `https://${brandDomain}`;

  return {
    ok: true,
    bookingId: booking.id,
    page: {
      reservationCode,
      guestName: booking.guestName,
      villaName: booking.villa.name,
      amount,
      brandName: siteBrand.siteInfo || company.brandName || "Tatildeyiz",
      brandDomain,
      callbackOrigin,
      alreadyPaid,
      paidTotal,
      optionExpired,
      status: booking.status,
    },
  };
}

export async function getBookingForIyzicoInitialize(code: string) {
  const trimmed = code.trim();
  const numericCode = Number.parseInt(trimmed, 10);
  return prisma.booking.findFirst({
    where: Number.isFinite(numericCode)
      ? { externalCode: numericCode }
      : { id: trimmed },
    select: {
      id: true,
      externalCode: true,
      guestName: true,
      guestEmail: true,
      guestPhone: true,
      status: true,
      optionExpiresAt: true,
      details: true,
      prepayments: { select: { amount: true } },
    },
  });
}

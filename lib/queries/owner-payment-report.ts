import { prisma } from "@/lib/db";
import type { AdminBookingListItem } from "@/lib/booking-display";
import {
  normalizeBookingSiteInfo,
  normalizeOwnerPayments,
  parseBookingDetails,
  resolveBookingCommissionAmount,
} from "@/lib/booking-form-details";
import { resolveBookingSiteBrand } from "@/lib/booking-site-brand";
import { getOwnerDisplayName } from "@/lib/btrans-report";
import { computeOwnerPayableAmount } from "@/lib/owner-payment-schedule";
import {
  OWNER_PAYMENT_EXCEL_HEADERS,
  buildOwnerPaymentExcelRow,
  buildOwnerPaymentExportFilename,
  checkOwnerPaymentMissingFields,
  normalizeOwnerIban,
  resolveOwnerPaymentRecipientName,
  type OwnerPaymentExportInput,
} from "@/lib/owner-payment-export";
import { getCompanySettings } from "@/lib/queries/company-settings";

export type OwnerPaymentReportListItem = AdminBookingListItem & {
  ownerName: string;
  recipientName: string;
  bankIban: string;
  ownerPayableAmount: number;
  paidAmount: number;
  remainingAmount: number;
  missing: string[];
  exportable: boolean;
};

const ownerPaymentBookingSelect = {
  id: true,
  externalCode: true,
  guestEmail: true,
  guestName: true,
  guestPhone: true,
  checkIn: true,
  checkOut: true,
  adults: true,
  children: true,
  babies: true,
  pets: true,
  totalPrice: true,
  status: true,
  createdAt: true,
  optionExpiresAt: true,
  details: true,
  villa: {
    select: {
      id: true,
      villaId: true,
      slug: true,
      name: true,
      originalName: true,
      documentNo: true,
      owner: {
        select: {
          type: true,
          name: true,
          firstName: true,
          lastName: true,
          companyTitle: true,
          bankAccountHolder: true,
          bankIban: true,
        },
      },
    },
  },
} as const;

type OwnerPaymentBookingRecord = {
  id: string;
  externalCode: number | null;
  guestEmail: string;
  guestName: string;
  guestPhone: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  babies: number;
  pets: number;
  totalPrice: number | null;
  status: AdminBookingListItem["status"];
  createdAt: Date;
  optionExpiresAt: Date | null;
  details: unknown;
  villa: {
    id: string;
    villaId: number | null;
    slug: string;
    name: string;
    originalName: string;
    documentNo: string;
    owner: {
      type: "GERCEK_KISI" | "TUZEL_KISI";
      name: string;
      firstName: string;
      lastName: string;
      companyTitle: string;
      bankAccountHolder: string;
      bankIban: string;
    } | null;
  };
};

function resolveOwnerName(
  owner: OwnerPaymentBookingRecord["villa"]["owner"]
): string {
  if (!owner) return "—";
  return getOwnerDisplayName({
    type: owner.type,
    name: owner.name,
    firstName: owner.firstName,
    lastName: owner.lastName,
    companyTitle: owner.companyTitle,
    tcKimlikNo: "",
    taxNumber: "",
    bankIban: owner.bankIban,
    phone: "",
    email: "",
  });
}

function toExportInput(
  booking: OwnerPaymentBookingRecord,
  remainingAmount: number
): OwnerPaymentExportInput {
  return {
    guestName: booking.guestName,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    payableAmount: remainingAmount,
    villaName: booking.villa.name,
    owner: booking.villa.owner,
  };
}

function mapBookingToListItem(
  booking: OwnerPaymentBookingRecord,
  brandFallback: { brandName: string; domain: string; logoUrl: string }
): OwnerPaymentReportListItem {
  const details = parseBookingDetails(booking.details);
  const prepaymentAmount =
    details.prepaymentAmount != null && Number.isFinite(details.prepaymentAmount)
      ? Math.round(details.prepaymentAmount)
      : null;
  const commissionAmount = resolveBookingCommissionAmount(
    details,
    booking.totalPrice
  );
  const ownerPayableAmount = computeOwnerPayableAmount(
    prepaymentAmount,
    commissionAmount
  );
  const paidAmount = normalizeOwnerPayments(details.ownerPayments).reduce(
    (sum, row) => sum + row.amount,
    0
  );
  const remainingAmount = Math.max(0, ownerPayableAmount - paidAmount);
  const exportInput = toExportInput(booking, remainingAmount);
  const missing = checkOwnerPaymentMissingFields(exportInput);
  const paymentMethod =
    details.importPaymentMethod?.trim() ||
    details.prepaymentBank?.trim() ||
    details.paymentMethod?.trim() ||
    null;
  const siteInfo = normalizeBookingSiteInfo(details.siteInfo);
  const siteBrand = resolveBookingSiteBrand({
    siteInfo,
    originDomain: details.originDomain,
    company: brandFallback,
  });

  return {
    id: booking.id,
    externalCode: booking.externalCode,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    adults: booking.adults,
    children: booking.children,
    babies: booking.babies,
    pets: booking.pets,
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
    guestPhone: booking.guestPhone,
    totalPrice: booking.totalPrice,
    status: booking.status,
    createdAt: booking.createdAt,
    optionExpiresAt: booking.optionExpiresAt,
    prepaymentAmount,
    paymentMethod,
    siteInfo,
    siteDomain: siteBrand.domain,
    villa: {
      id: booking.villa.id,
      villaId: booking.villa.villaId,
      slug: booking.villa.slug,
      name: booking.villa.name,
      originalName: booking.villa.originalName,
      documentNo: booking.villa.documentNo,
    },
    ownerName: resolveOwnerName(booking.villa.owner),
    recipientName: resolveOwnerPaymentRecipientName(booking.villa.owner) || "—",
    bankIban: normalizeOwnerIban(booking.villa.owner?.bankIban ?? ""),
    ownerPayableAmount,
    paidAmount,
    remainingAmount,
    missing,
    exportable: missing.length === 0,
  };
}

export async function getOwnerPaymentReportListData() {
  const [companySettings, bookings, villas] = await Promise.all([
    getCompanySettings(),
    prisma.booking.findMany({
      where: { status: "CONFIRMED" },
      select: ownerPaymentBookingSelect,
      orderBy: [{ checkIn: "desc" }, { createdAt: "desc" }],
    }),
    prisma.villa.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const brandFallback = {
    brandName: companySettings.brandName,
    domain: companySettings.domain,
    logoUrl: companySettings.logoUrl,
  };

  const items = bookings.map((booking) =>
    mapBookingToListItem(booking, brandFallback)
  );

  const missingIbanCount = items.filter((item) =>
    item.missing.some((field) => field.toLowerCase().includes("iban"))
  ).length;

  const warnings =
    missingIbanCount > 0
      ? [
          `${missingIbanCount} kayıtta ev sahibi IBAN bilgisi eksik veya geçersiz. Bu satırlar Excel'e alınmaz.`,
        ]
      : [];

  return { items, villas, warnings };
}

export async function generateOwnerPaymentReportExport(bookingIds: string[]) {
  const uniqueIds = [...new Set(bookingIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return {
      rows: [[...OWNER_PAYMENT_EXCEL_HEADERS]] as (string | number)[][],
      filename: buildOwnerPaymentExportFilename(),
      count: 0,
      incompleteCount: 0,
    };
  }

  const bookings = await prisma.booking.findMany({
    where: { id: { in: uniqueIds }, status: "CONFIRMED" },
    select: ownerPaymentBookingSelect,
    orderBy: [{ checkIn: "asc" }, { createdAt: "asc" }],
  });

  const rows: (string | number)[][] = [[...OWNER_PAYMENT_EXCEL_HEADERS]];
  let incompleteCount = 0;

  for (const booking of bookings) {
    const details = parseBookingDetails(booking.details);
    const prepaymentAmount =
      details.prepaymentAmount != null &&
      Number.isFinite(details.prepaymentAmount)
        ? Math.round(details.prepaymentAmount)
        : null;
    const commissionAmount = resolveBookingCommissionAmount(
      details,
      booking.totalPrice
    );
    const ownerPayableAmount = computeOwnerPayableAmount(
      prepaymentAmount,
      commissionAmount
    );
    const paidAmount = normalizeOwnerPayments(details.ownerPayments).reduce(
      (sum, row) => sum + row.amount,
      0
    );
    const remainingAmount = Math.max(0, ownerPayableAmount - paidAmount);
    const exportInput = toExportInput(booking, remainingAmount);
    const missing = checkOwnerPaymentMissingFields(exportInput);
    if (missing.length > 0) {
      incompleteCount += 1;
      continue;
    }
    rows.push(buildOwnerPaymentExcelRow(exportInput));
  }

  return {
    rows,
    filename: buildOwnerPaymentExportFilename(),
    count: rows.length - 1,
    incompleteCount,
  };
}

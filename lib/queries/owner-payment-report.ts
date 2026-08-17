import { prisma } from "@/lib/db";
import type { AdminBookingListItem } from "@/lib/booking-display";
import {
  normalizeBookingSiteInfo,
  normalizeGuestRefundPayments,
  normalizeOwnerPayments,
  parseBookingDetails,
  resolveBookingCommissionAmount,
  resolveExternalCode,
} from "@/lib/booking-form-details";
import { resolveBookingSiteBrand } from "@/lib/booking-site-brand";
import { getOwnerDisplayName } from "@/lib/btrans-report";
import {
  computeOwnerPaymentDueDate,
  resolveOwnerPayableCap,
} from "@/lib/owner-payment-schedule";
import {
  OWNER_PAYMENT_EXCEL_HEADERS,
  buildGuestRefundPaymentExcelRow,
  buildOwnerPaymentExcelRow,
  buildOwnerPaymentExportFilename,
  checkGuestRefundPaymentMissingFields,
  checkOwnerPaymentMissingFields,
  normalizeOwnerIban,
  resolveOwnerPaymentRecipientName,
  type OwnerPaymentExportInput,
} from "@/lib/owner-payment-export";
import { getCompanySettings } from "@/lib/queries/company-settings";

export type OwnerPaymentIncompleteRow = {
  bookingId: string;
  externalCode: string;
  guestName: string;
  villaName: string;
  missing: string[];
};

export type OwnerPaymentMailRow = {
  externalCode: string;
  ownerName: string;
  villaName: string;
  amount: number;
};

export type OwnerPaymentReportListItem = AdminBookingListItem & {
  /** Aynı rezervasyonda villa sahibi + misafir iade satırı olabilir. */
  reportRowId: string;
  paymentKind: "owner" | "guest_refund";
  ownerName: string;
  recipientName: string;
  bankIban: string;
  ownerPayableAmount: number;
  paidAmount: number;
  remainingAmount: number;
  /** yyyy-mm-dd — formdaki «Villa Sahibine Ödeme Yapılacak Tarih» / misafir iade tarihi */
  ownerPaymentDueDate: string;
  ownerPayments: ReturnType<typeof normalizeOwnerPayments>;
  missing: string[];
  paymentStatus: "paid" | "ready" | "incomplete";
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
  confirmationSentAt: true,
  optionExpiresAt: true,
  details: true,
  prepayments: { select: { amount: true } },
  villa: {
    select: {
      id: true,
      villaId: true,
      slug: true,
      name: true,
      originalName: true,
      documentNo: true,
      prepaymentPaymentType: {
        select: { name: true },
      },
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
  confirmationSentAt: Date | null;
  optionExpiresAt: Date | null;
  details: unknown;
  prepayments: Array<{ amount: number }>;
  villa: {
    id: string;
    villaId: number | null;
    slug: string;
    name: string;
    originalName: string;
    documentNo: string;
    prepaymentPaymentType: { name: string } | null;
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

function resolveOwnerPaymentStatus(
  remainingAmount: number,
  missing: string[]
): OwnerPaymentReportListItem["paymentStatus"] {
  if (remainingAmount <= 0) return "paid";
  if (missing.length === 0) return "ready";
  return "incomplete";
}

function resolveOwnerPayableForBooking(
  booking: OwnerPaymentBookingRecord,
  details: ReturnType<typeof parseBookingDetails>
): number {
  const realizedPrepayment = booking.prepayments.reduce(
    (sum, row) => sum + row.amount,
    0
  );
  return resolveOwnerPayableCap({
    status: booking.status,
    realizedPrepayment,
    commissionAmount: resolveBookingCommissionAmount(
      details,
      booking.totalPrice
    ),
    storedOwnerPayableAmount: details.ownerPayableAmount,
  });
}

function mapBookingToOwnerListItem(
  booking: OwnerPaymentBookingRecord,
  brandFallback: { brandName: string; domain: string; logoUrl: string }
): OwnerPaymentReportListItem {
  const details = parseBookingDetails(booking.details);
  const realizedPrepayment = booking.prepayments.reduce(
    (sum, row) => sum + row.amount,
    0
  );
  const plannedPrepayment =
    details.prepaymentAmount != null && Number.isFinite(details.prepaymentAmount)
      ? Math.round(details.prepaymentAmount)
      : null;
  const prepaymentAmount =
    realizedPrepayment > 0 ? realizedPrepayment : plannedPrepayment;
  const ownerPayableAmount = resolveOwnerPayableForBooking(booking, details);
  const ownerPayments = normalizeOwnerPayments(details.ownerPayments);
  const paidAmount = ownerPayments.reduce((sum, row) => sum + row.amount, 0);
  const remainingAmount = Math.max(0, ownerPayableAmount - paidAmount);
  const paymentTypeName =
    booking.villa.prepaymentPaymentType?.name?.trim() ||
    details.ownerPaymentTerm?.trim() ||
    "";
  const ownerPaymentDueDate =
    booking.status === "CANCELLED"
      ? (details.ownerPaymentDueDate ?? "").trim() ||
        computeOwnerPaymentDueDate({
          paymentTypeName,
          confirmationDate: booking.confirmationSentAt,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
        }) ||
        ""
      : computeOwnerPaymentDueDate({
          paymentTypeName,
          confirmationDate: booking.confirmationSentAt,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
        }) ||
        (details.ownerPaymentDueDate ?? "").trim() ||
        "";
  const exportInput = toExportInput(booking, remainingAmount);
  const rawMissing = checkOwnerPaymentMissingFields(exportInput);
  const missing =
    remainingAmount > 0
      ? rawMissing
      : rawMissing.filter((field) => field !== "Ödenecek tutar");
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
    reportRowId: `${booking.id}:owner`,
    paymentKind: "owner",
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
    confirmedAt: null,
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
    ownerPayments,
    ownerPaymentDueDate,
    missing,
    paymentStatus: resolveOwnerPaymentStatus(remainingAmount, rawMissing),
    exportable: remainingAmount > 0 && rawMissing.length === 0,
  };
}

function mapBookingToGuestRefundListItem(
  booking: OwnerPaymentBookingRecord,
  brandFallback: { brandName: string; domain: string; logoUrl: string }
): OwnerPaymentReportListItem | null {
  const details = parseBookingDetails(booking.details);
  const realizedPrepayment = booking.prepayments.reduce(
    (sum, row) => sum + row.amount,
    0
  );
  if (realizedPrepayment <= 0) return null;

  const refundAmount = Math.max(
    0,
    Math.round(Number(details.guestRefundAmount) || 0)
  );
  if (refundAmount <= 0) return null;

  const guestRefundPayments = normalizeGuestRefundPayments(
    details.guestRefundPayments
  );
  const paidAmount = guestRefundPayments.reduce(
    (sum, row) => sum + row.amount,
    0
  );
  const remainingAmount = Math.max(0, refundAmount - paidAmount);
  const prepaymentAmount =
    details.prepaymentAmount != null && Number.isFinite(details.prepaymentAmount)
      ? Math.round(details.prepaymentAmount)
      : null;
  const ownerPaymentDueDate = (details.guestRefundPaymentDate ?? "").trim();
  const rawMissing = checkGuestRefundPaymentMissingFields({
    guestName: booking.guestName,
    payableAmount: remainingAmount,
    villaName: booking.villa.name,
  });
  const missing =
    remainingAmount > 0
      ? rawMissing
      : rawMissing.filter((field) => field !== "Ödenecek tutar");
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
    reportRowId: `${booking.id}:guest-refund`,
    paymentKind: "guest_refund",
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
    confirmedAt: null,
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
    ownerName: booking.guestName,
    recipientName: booking.guestName || "—",
    bankIban: "",
    ownerPayableAmount: refundAmount,
    paidAmount,
    remainingAmount,
    ownerPayments: guestRefundPayments,
    ownerPaymentDueDate,
    missing,
    paymentStatus: resolveOwnerPaymentStatus(remainingAmount, rawMissing),
    exportable: remainingAmount > 0 && rawMissing.length === 0,
  };
}

function mapBookingToReportRows(
  booking: OwnerPaymentBookingRecord,
  brandFallback: { brandName: string; domain: string; logoUrl: string }
): OwnerPaymentReportListItem[] {
  const rows: OwnerPaymentReportListItem[] = [];
  const ownerRow = mapBookingToOwnerListItem(booking, brandFallback);
  if (ownerRow.ownerPayableAmount > 0) rows.push(ownerRow);
  const guestRow = mapBookingToGuestRefundListItem(booking, brandFallback);
  if (guestRow) rows.push(guestRow);
  return rows;
}

export async function getOwnerPaymentReportListData() {
  const [companySettings, bookings, villas] = await Promise.all([
    getCompanySettings(),
    prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "COMPENSATION", "CANCELLED"] },
      },
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

  const items = bookings.flatMap((booking) =>
    mapBookingToReportRows(booking, brandFallback)
  );

  const missingIbanCount = items.filter(
    (item) =>
      item.paymentKind === "owner" &&
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

  // reportRowId (`bookingId:owner` / `bookingId:guest-refund`) veya düz bookingId
  const requestedRowIds = new Set(uniqueIds);
  const bookingIdSet = new Set(
    uniqueIds.map((id) => id.split(":")[0] ?? id).filter(Boolean)
  );
  const legacyPlainIds = uniqueIds.every((id) => !id.includes(":"));

  const bookings = await prisma.booking.findMany({
    where: {
      id: { in: [...bookingIdSet] },
      status: { in: ["CONFIRMED", "COMPENSATION", "CANCELLED"] },
    },
    select: ownerPaymentBookingSelect,
    orderBy: [{ checkIn: "asc" }, { createdAt: "asc" }],
  });

  const rows: (string | number)[][] = [[...OWNER_PAYMENT_EXCEL_HEADERS]];
  let incompleteCount = 0;
  const brandFallback = { brandName: "", domain: "", logoUrl: "" };

  for (const booking of bookings) {
    const reportRows = mapBookingToReportRows(booking, brandFallback).filter(
      (item) =>
        legacyPlainIds ||
        requestedRowIds.has(item.reportRowId) ||
        requestedRowIds.has(item.id)
    );

    for (const item of reportRows) {
      if (item.remainingAmount <= 0) continue;
      if (!item.exportable) {
        incompleteCount += 1;
        continue;
      }
      if (item.paymentKind === "guest_refund") {
        rows.push(
          buildGuestRefundPaymentExcelRow({
            guestName: booking.guestName,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            payableAmount: item.remainingAmount,
            villaName: booking.villa.name,
          })
        );
      } else {
        rows.push(
          buildOwnerPaymentExcelRow(
            toExportInput(booking, item.remainingAmount)
          )
        );
      }
    }
  }

  return {
    rows,
    filename: buildOwnerPaymentExportFilename(),
    count: rows.length - 1,
    incompleteCount,
  };
}

function resolveOwnerPaymentRemaining(booking: OwnerPaymentBookingRecord) {
  const details = parseBookingDetails(booking.details);
  const ownerPayableAmount = resolveOwnerPayableForBooking(booking, details);
  const paidAmount = normalizeOwnerPayments(details.ownerPayments).reduce(
    (sum, row) => sum + row.amount,
    0
  );
  const remainingAmount = Math.max(0, ownerPayableAmount - paidAmount);
  return { remainingAmount };
}

function resolveGuestRefundRemaining(booking: OwnerPaymentBookingRecord) {
  const details = parseBookingDetails(booking.details);
  const realizedPrepayment = booking.prepayments.reduce(
    (sum, row) => sum + row.amount,
    0
  );
  if (realizedPrepayment <= 0) {
    return { refundAmount: 0, remainingAmount: 0 };
  }
  const refundAmount = Math.max(
    0,
    Math.round(Number(details.guestRefundAmount) || 0)
  );
  const paidAmount = normalizeGuestRefundPayments(
    details.guestRefundPayments
  ).reduce((sum, row) => sum + row.amount, 0);
  return {
    refundAmount,
    remainingAmount: Math.max(0, refundAmount - paidAmount),
  };
}

/**
 * Günlük e-posta:
 * - giriş tarihi dateKey olan kayıtlar,
 * - overdueBeforeDateKey tarihinden önce vadesi gelmiş ve hâlâ açık ödemeler.
 */
export async function generateOwnerPaymentReportForCheckInDate(
  dateKey: string,
  overdueBeforeDateKey = dateKey
) {
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "COMPENSATION", "CANCELLED"] },
    },
    select: ownerPaymentBookingSelect,
    orderBy: [{ checkIn: "asc" }, { createdAt: "asc" }],
  });

  const rows: (string | number)[][] = [[...OWNER_PAYMENT_EXCEL_HEADERS]];
  const incomplete: OwnerPaymentIncompleteRow[] = [];
  const payments: OwnerPaymentMailRow[] = [];
  let paidCount = 0;
  let matchedCount = 0;
  let overdueCount = 0;

  for (const booking of bookings) {
    const ownerRemaining = resolveOwnerPaymentRemaining(booking);
    const guestRemaining = resolveGuestRefundRemaining(booking);
    const hasOwnerPayable = ownerRemaining.remainingAmount > 0;
    const hasGuestRefund =
      guestRemaining.refundAmount > 0 && guestRemaining.remainingAmount > 0;
    const hasOwnerFullyPaid =
      resolveOwnerPayableForBooking(
        booking,
        parseBookingDetails(booking.details)
      ) > 0 && ownerRemaining.remainingAmount <= 0;
    const hasGuestFullyPaid =
      guestRemaining.refundAmount > 0 && guestRemaining.remainingAmount <= 0;
    const ownerItem = mapBookingToOwnerListItem(booking, {
      brandName: "",
      domain: "",
      logoUrl: "",
    });
    const guestItem = mapBookingToGuestRefundListItem(booking, {
      brandName: "",
      domain: "",
      logoUrl: "",
    });
    const checkInDateKey = booking.checkIn.toISOString().slice(0, 10);
    const isScheduledForCheckIn = checkInDateKey === dateKey;
    const hasOverdueOwnerPayment =
      hasOwnerPayable &&
      Boolean(ownerItem.ownerPaymentDueDate) &&
      ownerItem.ownerPaymentDueDate < overdueBeforeDateKey;
    const hasOverdueGuestRefund =
      hasGuestRefund &&
      Boolean(guestItem?.ownerPaymentDueDate) &&
      (guestItem?.ownerPaymentDueDate ?? "") < overdueBeforeDateKey;
    const isOverdue = hasOverdueOwnerPayment || hasOverdueGuestRefund;

    if (
      !hasOwnerPayable &&
      !hasGuestRefund &&
      !hasOwnerFullyPaid &&
      !hasGuestFullyPaid
    ) {
      // Ödenecek tutarı olmayan rezervasyonlar matchedCount'a alınmaz
      continue;
    }
    if (!isScheduledForCheckIn && !isOverdue) continue;

    matchedCount += 1;
    if (isOverdue) overdueCount += 1;

    if (hasOwnerFullyPaid || hasGuestFullyPaid) {
      paidCount += 1;
    }

    if (hasOwnerPayable) {
      const exportInput = toExportInput(
        booking,
        ownerRemaining.remainingAmount
      );
      const missing = checkOwnerPaymentMissingFields(exportInput);
      if (missing.length > 0) {
        incomplete.push({
          bookingId: booking.id,
          externalCode:
            resolveExternalCode(booking.externalCode, booking.guestEmail) ||
            booking.id,
          guestName: booking.guestName,
          villaName: booking.villa.name,
          missing,
        });
      } else {
        rows.push(buildOwnerPaymentExcelRow(exportInput));
        payments.push({
          externalCode:
            resolveExternalCode(booking.externalCode, booking.guestEmail) ||
            booking.id,
          ownerName: resolveOwnerName(booking.villa.owner),
          villaName: booking.villa.name,
          amount: Math.round(ownerRemaining.remainingAmount),
        });
      }
    }

    if (hasGuestRefund) {
      const missing = checkGuestRefundPaymentMissingFields({
        guestName: booking.guestName,
        payableAmount: guestRemaining.remainingAmount,
        villaName: booking.villa.name,
      });
      if (missing.length > 0) {
        incomplete.push({
          bookingId: `${booking.id}:guest-refund`,
          externalCode:
            resolveExternalCode(booking.externalCode, booking.guestEmail) ||
            booking.id,
          guestName: `${booking.guestName} (Misafir İade)`,
          villaName: booking.villa.name,
          missing,
        });
      } else {
        rows.push(
          buildGuestRefundPaymentExcelRow({
            guestName: booking.guestName,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            payableAmount: guestRemaining.remainingAmount,
            villaName: booking.villa.name,
          })
        );
        payments.push({
          externalCode:
            resolveExternalCode(booking.externalCode, booking.guestEmail) ||
            booking.id,
          ownerName: `${booking.guestName} (Misafir İade)`,
          villaName: booking.villa.name,
          amount: Math.round(guestRemaining.remainingAmount),
        });
      }
    }
  }

  return {
    rows,
    filename: `ev-sahibi-odemeleri-${dateKey}.xlsx`,
    matchedCount,
    count: rows.length - 1,
    paidCount,
    overdueCount,
    incompleteCount: incomplete.length,
    incomplete,
    payments,
  };
}

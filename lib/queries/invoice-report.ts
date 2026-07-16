import { prisma } from "@/lib/db";
import { normalizeActivityLogs } from "@/lib/booking-activity-log-core";
import type { AdminBookingListItem } from "@/lib/booking-display";
import {
  parseBookingDetails,
  resolveBookingCommissionAmount,
  resolveExternalCode,
} from "@/lib/booking-form-details";
import { getOwnerDisplayName } from "@/lib/btrans-report";
import {
  buildInvoiceReportExportFilename,
  buildInvoiceReportRow,
  checkInvoiceReportMissingFields,
  EDM_INVOICE_EXCEL_HEADERS,
  isWithinMonth,
  type InvoiceReportDateBasis,
  type InvoiceReportIncompleteRow,
  type InvoiceReportBookingInput,
} from "@/lib/edm-invoice-export";
import { getCompanySettings } from "@/lib/queries/company-settings";

export type InvoiceReportListItem = AdminBookingListItem & {
  ownerName: string;
  commissionAmount: number;
  missing: string[];
  exportable: boolean;
};

const invoiceBookingSelect = {
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
          tcKimlikNo: true,
          taxNumber: true,
          address: true,
          country: true,
          mernisIlceCode: true,
        },
      },
    },
  },
} as const;

type InvoiceBookingRecord = {
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
      tcKimlikNo: string;
      taxNumber: string;
      address: string;
      country: string;
      mernisIlceCode: string | null;
    } | null;
  };
};

function resolveApprovedAt(details: unknown, createdAt: Date): Date {
  const parsed = parseBookingDetails(details);
  const logs = normalizeActivityLogs(parsed.activityLogs);
  const approvalLog = logs.find(
    (log) => log.action === "status_changed" && log.meta?.to === "CONFIRMED"
  );
  if (approvalLog) {
    const at = new Date(approvalLog.at);
    if (!Number.isNaN(at.getTime())) return at;
  }
  return createdAt;
}

function resolveReportBasisDate(
  booking: {
    createdAt: Date;
    checkIn: Date;
    details: unknown;
  },
  dateBasis: InvoiceReportDateBasis
): Date {
  if (dateBasis === "approvedAt") {
    return resolveApprovedAt(booking.details, booking.createdAt);
  }
  if (dateBasis === "createdAt") return booking.createdAt;
  return booking.checkIn;
}

function toBookingInput(booking: InvoiceBookingRecord): InvoiceReportBookingInput {
  const details = parseBookingDetails(booking.details);

  return {
    bookingId: booking.id,
    externalCode:
      resolveExternalCode(booking.externalCode, booking.guestEmail) || booking.id,
    guestName: booking.guestName,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    commissionAmount: resolveBookingCommissionAmount(details, booking.totalPrice),
    owner: booking.villa.owner,
    villa: { name: booking.villa.name },
  };
}

function resolveOwnerName(owner: InvoiceBookingRecord["villa"]["owner"]): string {
  if (!owner) return "—";
  return getOwnerDisplayName({
    type: owner.type,
    name: owner.name,
    firstName: owner.firstName,
    lastName: owner.lastName,
    companyTitle: owner.companyTitle,
    tcKimlikNo: owner.tcKimlikNo,
    taxNumber: owner.taxNumber,
    bankIban: "",
    phone: "",
    email: "",
  });
}

function mapBookingToListItem(
  booking: InvoiceBookingRecord,
  company: { taxNumber: string }
): InvoiceReportListItem {
  const details = parseBookingDetails(booking.details);
  const prepaymentAmount =
    details.prepaymentAmount != null && Number.isFinite(details.prepaymentAmount)
      ? Math.round(details.prepaymentAmount)
      : null;
  const paymentMethod =
    details.importPaymentMethod?.trim() ||
    details.prepaymentBank?.trim() ||
    details.paymentMethod?.trim() ||
    null;
  const invoiceInput = toBookingInput(booking);
  const missing = checkInvoiceReportMissingFields(invoiceInput, company);

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
    villa: {
      id: booking.villa.id,
      villaId: booking.villa.villaId,
      slug: booking.villa.slug,
      name: booking.villa.name,
      originalName: booking.villa.originalName,
      documentNo: booking.villa.documentNo,
    },
    ownerName: resolveOwnerName(booking.villa.owner),
    commissionAmount: invoiceInput.commissionAmount,
    missing,
    exportable: missing.length === 0,
  };
}

function buildCompanyWarnings(taxNumber: string) {
  return taxNumber.trim()
    ? []
    : [
        "Şirket ayarlarında vergi numarası (VKN) tanımlı değil. Gönderici VKN sütunu boş kalır.",
      ];
}

export async function getInvoiceReportListData() {
  const [companySettings, bookings, villas] = await Promise.all([
    getCompanySettings(),
    prisma.booking.findMany({
      select: invoiceBookingSelect,
      orderBy: [{ checkIn: "desc" }, { createdAt: "desc" }],
    }),
    prisma.villa.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const company = { taxNumber: companySettings.taxNumber };
  const items = bookings.map((booking) =>
    mapBookingToListItem(booking, company)
  );

  return {
    items,
    villas,
    warnings: buildCompanyWarnings(companySettings.taxNumber),
  };
}

export async function generateInvoiceReportExport(bookingIds: string[]) {
  const uniqueIds = [...new Set(bookingIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return {
      rows: [EDM_INVOICE_EXCEL_HEADERS] as (string | number)[][],
      filename: buildInvoiceReportExportFilename(),
      count: 0,
      incompleteCount: 0,
      incomplete: [] as InvoiceReportIncompleteRow[],
      warnings: buildCompanyWarnings(""),
    };
  }

  const [companySettings, bookings] = await Promise.all([
    getCompanySettings(),
    prisma.booking.findMany({
      where: { id: { in: uniqueIds } },
      select: invoiceBookingSelect,
      orderBy: [{ checkIn: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const company = { taxNumber: companySettings.taxNumber };
  const rows: (string | number)[][] = [EDM_INVOICE_EXCEL_HEADERS];
  const incomplete: InvoiceReportIncompleteRow[] = [];

  for (const booking of bookings) {
    const item = toBookingInput(booking);
    const missing = checkInvoiceReportMissingFields(item, company);
    if (missing.length > 0) {
      incomplete.push({
        bookingId: item.bookingId,
        externalCode: item.externalCode,
        guestName: item.guestName,
        villaName: item.villa.name,
        ownerName: resolveOwnerName(booking.villa.owner),
        checkIn: item.checkIn.toISOString().slice(0, 10),
        missing,
      });
      continue;
    }

    rows.push(buildInvoiceReportRow(item, company));
  }

  return {
    rows,
    filename: buildInvoiceReportExportFilename(),
    count: rows.length - 1,
    incompleteCount: incomplete.length,
    incomplete,
    warnings: buildCompanyWarnings(companySettings.taxNumber),
  };
}

/** @deprecated Ay bazlı rapor — yeni ekran filtre + liste kullanır */
export async function generateInvoiceReport(input: {
  year: number;
  month: number;
  dateBasis: InvoiceReportDateBasis;
}) {
  const { year, month, dateBasis } = input;

  const [companySettings, bookings] = await Promise.all([
    getCompanySettings(),
    prisma.booking.findMany({
      where: { status: "CONFIRMED" },
      select: invoiceBookingSelect,
      orderBy: [{ checkIn: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const company = { taxNumber: companySettings.taxNumber };
  const rows: (string | number)[][] = [EDM_INVOICE_EXCEL_HEADERS];
  const incomplete: InvoiceReportIncompleteRow[] = [];

  for (const booking of bookings) {
    const basisDate = resolveReportBasisDate(booking, dateBasis);
    if (!isWithinMonth(basisDate, year, month)) continue;

    const item = toBookingInput(booking);
    const missing = checkInvoiceReportMissingFields(item, company);
    if (missing.length > 0) {
      incomplete.push({
        bookingId: item.bookingId,
        externalCode: item.externalCode,
        guestName: item.guestName,
        villaName: item.villa.name,
        ownerName: resolveOwnerName(booking.villa.owner),
        checkIn: item.checkIn.toISOString().slice(0, 10),
        missing,
      });
      continue;
    }

    rows.push(buildInvoiceReportRow(item, company));
  }

  return {
    rows,
    filename: `edm-fatura-raporu-${year}-${String(month).padStart(2, "0")}.xlsx`,
    count: rows.length - 1,
    incompleteCount: incomplete.length,
    incomplete,
    warnings: buildCompanyWarnings(companySettings.taxNumber),
  };
}

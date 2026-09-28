import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseBookingDetails } from "@/lib/booking-form-details";
import { formatBookingReservationNo } from "@/lib/booking-display";
import { getBookingStatusLabel } from "@/lib/booking-status";
import { normalizeGuestEmail } from "@/lib/booking-guest-contact";
import { buildOwnerDisplayName } from "@/lib/villa-owner-utils";
import {
  CHART_ACCOUNT_KIND,
  customerChartAccountCode,
  ownerChartAccountCode,
  type ChartAccountCsvRow,
  type ChartAccountKind,
} from "@/lib/chart-account-export";

const REPORT_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.COMPENSATION,
];

export type ChartAccountCustomerRow = ChartAccountCsvRow & {
  kind: typeof CHART_ACCOUNT_KIND.CUSTOMER;
  subjectId: string;
  reservationNo: string;
  villaName: string;
  statusLabel: string;
  exportedAt: string | null;
};

export type ChartAccountOwnerRow = ChartAccountCsvRow & {
  kind: typeof CHART_ACCOUNT_KIND.OWNER;
  subjectId: string;
  ownerId: string;
  storedAccountingCode: string;
  needsAccountingCode: boolean;
  reservationCount: number;
  exportedAt: string | null;
};

function joinAddress(parts: Array<string | undefined>) {
  return parts
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
}

function ownerName(owner: {
  type: "GERCEK_KISI" | "TUZEL_KISI";
  name: string;
  firstName: string;
  lastName: string;
  companyTitle: string;
}) {
  return (
    owner.name.trim() ||
    buildOwnerDisplayName({
      type: owner.type,
      firstName: owner.firstName,
      lastName: owner.lastName,
      companyTitle: owner.companyTitle,
    })
  );
}

export async function getChartAccountReport() {
  const [bookings, exports] = await Promise.all([
    prisma.booking.findMany({
      where: { status: { in: REPORT_STATUSES } },
      select: {
        id: true,
        externalCode: true,
        guestName: true,
        guestEmail: true,
        status: true,
        details: true,
        villa: {
          select: {
            name: true,
            owner: {
              select: {
                id: true,
                type: true,
                name: true,
                firstName: true,
                lastName: true,
                companyTitle: true,
                email: true,
                tcKimlikNo: true,
                taxOffice: true,
                taxNumber: true,
                address: true,
                accountingCode: true,
              },
            },
          },
        },
      },
      orderBy: [{ externalCode: "asc" }, { createdAt: "asc" }],
    }),
    prisma.chartAccountExport.findMany({
      select: {
        kind: true,
        subjectId: true,
        exportedAt: true,
      },
    }),
  ]);

  const exportedAt = new Map(
    exports.map((row) => [`${row.kind}:${row.subjectId}`, row.exportedAt.toISOString()])
  );

  const customers: ChartAccountCustomerRow[] = bookings.map((booking) => {
    const details = parseBookingDetails(booking.details);
    const reservationNo = formatBookingReservationNo(booking);
    const address = joinAddress([
      details.invoiceAddress || details.guestAddress,
      details.invoiceDistrict || details.guestDistrict,
      details.invoiceCity || details.guestCity,
    ]);
    return {
      kind: CHART_ACCOUNT_KIND.CUSTOMER,
      subjectId: booking.id,
      reservationNo,
      villaName: booking.villa.name,
      statusLabel: getBookingStatusLabel(booking.status),
      accountCode: customerChartAccountCode(reservationNo),
      accountName: (details.invoiceTitle || booking.guestName).trim(),
      taxNumber: (details.invoiceTaxNumber || "").trim(),
      taxOffice: (details.invoiceTaxOffice || "").trim(),
      tcKimlikNo: (details.guestTc || "").trim(),
      address,
      currency: "TL",
      email: normalizeGuestEmail(booking.guestEmail),
      vatRate: "",
      vatAccountCode: "",
      exportedAt: exportedAt.get(`${CHART_ACCOUNT_KIND.CUSTOMER}:${booking.id}`) ?? null,
    };
  });

  const owners = new Map<string, ChartAccountOwnerRow>();
  for (const booking of bookings) {
    const owner = booking.villa.owner;
    if (!owner) continue;
    const current = owners.get(owner.id);
    if (current) {
      current.reservationCount += 1;
      continue;
    }
    const accountCode = ownerChartAccountCode(owner.accountingCode);
    owners.set(owner.id, {
      kind: CHART_ACCOUNT_KIND.OWNER,
      subjectId: owner.id,
      ownerId: owner.id,
      storedAccountingCode: owner.accountingCode.trim(),
      needsAccountingCode: !accountCode,
      reservationCount: 1,
      accountCode,
      accountName: ownerName(owner),
      taxNumber: owner.taxNumber.trim(),
      taxOffice: owner.taxOffice.trim(),
      tcKimlikNo: owner.tcKimlikNo.trim(),
      address: owner.address.trim(),
      currency: "TL",
      email: normalizeGuestEmail(owner.email),
      vatRate: "",
      vatAccountCode: "",
      exportedAt: exportedAt.get(`${CHART_ACCOUNT_KIND.OWNER}:${owner.id}`) ?? null,
    });
  }

  return {
    customers,
    owners: [...owners.values()].sort((a, b) =>
      a.accountName.localeCompare(b.accountName, "tr")
    ),
  };
}

export type { ChartAccountKind };

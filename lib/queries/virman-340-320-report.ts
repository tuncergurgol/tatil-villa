import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseBookingDetails } from "@/lib/booking-form-details";
import { formatBookingReservationNo } from "@/lib/booking-display";
import { getBookingStatusLabel } from "@/lib/booking-status";
import {
  CHART_ACCOUNT_KIND,
  customerChartAccountCode,
  ownerChartAccountCode,
  type Virman340320Row,
} from "@/lib/chart-account-export";

const REPORT_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.COMPENSATION,
];

function resolvePrepayment(
  prepaymentAmount: number | null | undefined,
  payments: Array<{ amount: number }>
) {
  if (
    typeof prepaymentAmount === "number" &&
    Number.isFinite(prepaymentAmount)
  ) {
    return Math.max(0, Math.round(prepaymentAmount));
  }
  return payments.reduce((sum, payment) => sum + payment.amount, 0);
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function getVirman340320Report() {
  const [bookings, exports] = await Promise.all([
    prisma.booking.findMany({
      where: { status: { in: REPORT_STATUSES } },
      select: {
        id: true,
        externalCode: true,
        guestName: true,
        checkIn: true,
        status: true,
        details: true,
        prepayments: { select: { amount: true } },
        villa: {
          select: {
            name: true,
            owner: {
              select: {
                id: true,
                name: true,
                accountingCode: true,
              },
            },
          },
        },
      },
      orderBy: [{ externalCode: "asc" }, { checkIn: "asc" }],
    }),
    prisma.chartAccountExport.findMany({
      where: { kind: CHART_ACCOUNT_KIND.VIRMAN },
      select: { subjectId: true, exportedAt: true },
    }),
  ]);

  const exportedAt = new Map(
    exports.map((row) => [row.subjectId, row.exportedAt.toISOString()])
  );

  const rows: Virman340320Row[] = bookings.map((booking) => {
    const details = parseBookingDetails(booking.details);
    const reservationNo = formatBookingReservationNo(booking);
    const owner = booking.villa.owner;
    const ownerAccountCode = owner
      ? ownerChartAccountCode(owner.accountingCode)
      : "";
    return {
      subjectId: booking.id,
      reservationNo,
      guestName: booking.guestName.trim(),
      villaName: booking.villa.name,
      ownerId: owner?.id ?? "",
      ownerName: owner?.name.trim() ?? "",
      storedAccountingCode: owner?.accountingCode.trim() ?? "",
      needsAccountingCode: Boolean(owner) && !ownerAccountCode,
      checkIn: dateKey(booking.checkIn),
      amount: resolvePrepayment(details.prepaymentAmount, booking.prepayments),
      customerAccountCode: customerChartAccountCode(reservationNo),
      ownerAccountCode,
      statusLabel: getBookingStatusLabel(booking.status),
      exportedAt: exportedAt.get(booking.id) ?? null,
    };
  });

  return rows;
}

import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatBookingReservationNo } from "@/lib/booking-display";
import { getBookingStatusLabel } from "@/lib/booking-status";
import {
  iyzicoTransactionDateKey,
  parseIyzicoPaymentRaw,
} from "@/lib/iyzico-payout";
import {
  CHART_ACCOUNT_KIND,
  customerChartAccountCode,
  splitIyzicoTahsilat,
  type IyzicoTahsilatRow,
} from "@/lib/chart-account-export";

type SessionRecord = {
  id: string;
  paymentId: string | null;
  paidPrice: number | null;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
  rawResult: unknown;
  booking: {
    id: string;
    externalCode: number | null;
    guestName: string;
    status: Parameters<typeof getBookingStatusLabel>[0];
  };
};

function pickSuccessSessions(sessions: SessionRecord[]) {
  const byBooking = new Map<string, SessionRecord[]>();
  for (const session of sessions) {
    const list = byBooking.get(session.booking.id) ?? [];
    list.push(session);
    byBooking.set(session.booking.id, list);
  }

  const picked: SessionRecord[] = [];
  for (const group of byBooking.values()) {
    const successes = [...group].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    const seen = new Set<string>();
    for (const row of successes) {
      const paymentId = row.paymentId?.trim() || row.id;
      if (seen.has(paymentId)) continue;
      seen.add(paymentId);
      picked.push(row);
    }
  }
  return picked;
}

export async function getIyzicoTahsilatReport(): Promise<IyzicoTahsilatRow[]> {
  const [sessions, exports] = await Promise.all([
    prisma.bookingPaymentSession.findMany({
      where: {
        providerSlug: "iyzico",
        status: "success",
        booking: { status: { not: BookingStatus.CANCELLED } },
      },
      select: {
        id: true,
        paymentId: true,
        paidPrice: true,
        amount: true,
        createdAt: true,
        updatedAt: true,
        rawResult: true,
        booking: {
          select: {
            id: true,
            externalCode: true,
            guestName: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.chartAccountExport.findMany({
      where: { kind: CHART_ACCOUNT_KIND.IYZICO_TAHSILAT },
      select: { subjectId: true, exportedAt: true },
    }),
  ]);

  const exportedAt = new Map(
    exports.map((row) => [row.subjectId, row.exportedAt.toISOString()])
  );

  return pickSuccessSessions(sessions)
    .map((session) => {
      const paidFallback =
        session.paidPrice != null && session.paidPrice > 0
          ? session.paidPrice
          : session.amount;
      const parsed = parseIyzicoPaymentRaw(session.rawResult, paidFallback);
      const split = splitIyzicoTahsilat(
        parsed.paidPrice,
        parsed.commissionTotal
      );
      const reservationNo = formatBookingReservationNo(
        session.booking.externalCode
      );
      return {
        subjectId: session.id,
        reservationNo,
        guestName: session.booking.guestName.trim() || "—",
        collectedOn: iyzicoTransactionDateKey(
          session.updatedAt ?? session.createdAt,
          parsed.systemTimeMs
        ),
        paidAmount: split.credit,
        commissionAmount: split.commissionDebit,
        bankAmount: split.bankDebit,
        customerAccountCode: customerChartAccountCode(reservationNo),
        statusLabel: getBookingStatusLabel(session.booking.status),
        exportedAt: exportedAt.get(session.id) ?? null,
      };
    })
    .filter((row) => row.paidAmount > 0)
    .sort((a, b) => b.collectedOn.localeCompare(a.collectedOn));
}

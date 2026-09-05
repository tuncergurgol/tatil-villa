import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatBookingReservationNo } from "@/lib/booking-display";
import { normalizeCompanyPaymentType } from "@/lib/company-payment-types";
import {
  formatIyzicoDateKey,
  iyzicoTransactionDateKey,
  parseIyzicoPaymentRaw,
  resolveIyzicoPayoutDateKey,
  resolveIyzicoPayoutStatus,
  type IyzicoPayoutStatus,
} from "@/lib/iyzico-payout";

export type IyzicoPaymentReportRow = {
  id: string;
  bookingId: string;
  reservationNo: string;
  guestName: string;
  paymentId: string | null;
  installment: number;
  transactionDateKey: string;
  payoutDateKey: string;
  paidAmount: number;
  commissionTotal: number;
  bankAmount: number;
  status: IyzicoPayoutStatus;
};

export const IYZICO_PAYMENT_EXCEL_HEADERS = [
  "Rezervasyon No",
  "Müşteri adı",
  "Ödeme Tarihi",
  "Ödeme Tutarı",
  "Komisyon + Kesinti toplamı",
  "Bankaya Yatacak Tutar",
  "Bankaya Yatacak Tarih",
  "Ödeme Durumu",
  "Taksit",
  "iyzico Ödeme No",
] as const;

type SessionRecord = {
  id: string;
  status: string;
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
    status: BookingStatus;
    prepayments: Array<{ amount: number; paymentChannel: string }>;
  };
};

export function buildIyzicoPaymentExportFilename(date = new Date()) {
  const stamp = date.toISOString().slice(0, 10);
  return `iyzico-odemeler-${stamp}.xlsx`;
}

export function toIyzicoPaymentExcelRow(
  row: IyzicoPaymentReportRow
): (string | number)[] {
  return [
    row.reservationNo,
    row.guestName,
    formatIyzicoDateKey(row.transactionDateKey),
    Number(row.paidAmount.toFixed(2)),
    Number(row.commissionTotal.toFixed(2)),
    Number(row.bankAmount.toFixed(2)),
    row.status === "cancelled" ? "—" : formatIyzicoDateKey(row.payoutDateKey),
    row.status === "paid"
      ? "Ödendi"
      : row.status === "cancelled"
        ? "İptal"
        : "Beklemede",
    row.installment <= 1 ? "Tek çekim" : `${row.installment} taksit`,
    row.paymentId ?? "",
  ];
}

function isCreditCardPrepayment(channel: string) {
  return normalizeCompanyPaymentType(channel) === "credit_card";
}

function creditCardAmounts(booking: SessionRecord["booking"]) {
  return new Set(
    booking.prepayments
      .filter((row) => isCreditCardPrepayment(row.paymentChannel))
      .map((row) => row.amount)
  );
}

function pickReportSessions(sessions: SessionRecord[]): SessionRecord[] {
  const byBooking = new Map<string, SessionRecord[]>();
  for (const session of sessions) {
    const list = byBooking.get(session.booking.id) ?? [];
    list.push(session);
    byBooking.set(session.booking.id, list);
  }

  const picked: SessionRecord[] = [];
  for (const group of byBooking.values()) {
    const successes = group
      .filter((row) => row.status === "success")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (successes.length > 0) {
      const seen = new Set<string>();
      for (const row of successes) {
        const paymentId = row.paymentId?.trim() || row.id;
        if (seen.has(paymentId)) continue;
        seen.add(paymentId);
        picked.push(row);
      }
      continue;
    }

    const cardAmounts = creditCardAmounts(group[0].booking);
    const pendingMatch = group
      .filter(
        (row) => row.status === "pending" && cardAmounts.has(row.amount)
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (pendingMatch) picked.push(pendingMatch);
  }

  return picked;
}

function toReportRow(session: SessionRecord): IyzicoPaymentReportRow {
  const paidFallback =
    session.paidPrice != null && session.paidPrice > 0
      ? session.paidPrice
      : session.amount;
  const parsed = parseIyzicoPaymentRaw(session.rawResult, paidFallback);
  const transactionDateKey = iyzicoTransactionDateKey(
    session.updatedAt ?? session.createdAt,
    parsed.systemTimeMs
  );
  const payoutDateKey = resolveIyzicoPayoutDateKey(transactionDateKey);
  const cancelled = session.booking.status === BookingStatus.CANCELLED;

  return {
    id: session.id,
    bookingId: session.booking.id,
    reservationNo: formatBookingReservationNo(session.booking.externalCode),
    guestName: session.booking.guestName.trim() || "—",
    paymentId: session.paymentId?.trim() || null,
    installment: parsed.installment,
    transactionDateKey,
    payoutDateKey,
    paidAmount: parsed.paidPrice,
    commissionTotal: cancelled ? 0 : parsed.commissionTotal,
    bankAmount: cancelled ? 0 : parsed.merchantPayoutAmount,
    status: cancelled
      ? "cancelled"
      : resolveIyzicoPayoutStatus(payoutDateKey),
  };
}

export async function getIyzicoPaymentReportRows(): Promise<
  IyzicoPaymentReportRow[]
> {
  const sessions = await prisma.bookingPaymentSession.findMany({
    where: {
      providerSlug: "iyzico",
      status: { in: ["success", "pending"] },
    },
    select: {
      id: true,
      status: true,
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
          prepayments: {
            select: { amount: true, paymentChannel: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return pickReportSessions(sessions)
    .map(toReportRow)
    .sort((a, b) => b.transactionDateKey.localeCompare(a.transactionDateKey));
}

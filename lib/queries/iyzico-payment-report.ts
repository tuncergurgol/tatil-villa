import { prisma } from "@/lib/db";
import { formatBookingReservationNo } from "@/lib/booking-display";
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
    formatIyzicoDateKey(row.payoutDateKey),
    row.status === "paid" ? "Ödendi" : "Beklemede",
    row.installment <= 1 ? "Tek çekim" : `${row.installment} taksit`,
    row.paymentId ?? "",
  ];
}

export async function getIyzicoPaymentReportRows(): Promise<
  IyzicoPaymentReportRow[]
> {
  const sessions = await prisma.bookingPaymentSession.findMany({
    where: {
      status: "success",
      providerSlug: "iyzico",
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
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const seenPaymentIds = new Set<string>();
  const rows: IyzicoPaymentReportRow[] = [];

  for (const session of sessions) {
    const paymentId = session.paymentId?.trim() || "";
    if (paymentId) {
      if (seenPaymentIds.has(paymentId)) continue;
      seenPaymentIds.add(paymentId);
    }

    const paidFallback = session.paidPrice ?? session.amount;
    const parsed = parseIyzicoPaymentRaw(session.rawResult, paidFallback);
    const transactionDateKey = iyzicoTransactionDateKey(
      session.updatedAt ?? session.createdAt,
      parsed.systemTimeMs
    );
    const payoutDateKey = resolveIyzicoPayoutDateKey(transactionDateKey);

    rows.push({
      id: session.id,
      bookingId: session.booking.id,
      reservationNo: formatBookingReservationNo(session.booking.externalCode),
      guestName: session.booking.guestName.trim() || "—",
      paymentId: paymentId || null,
      installment: parsed.installment,
      transactionDateKey,
      payoutDateKey,
      paidAmount: parsed.paidPrice,
      commissionTotal: parsed.commissionTotal,
      bankAmount: parsed.merchantPayoutAmount,
      status: resolveIyzicoPayoutStatus(payoutDateKey),
    });
  }

  return rows;
}

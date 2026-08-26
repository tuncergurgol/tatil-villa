import {
  addDaysToDateKey,
  getIstanbulDateKey,
} from "@/lib/booking-calendar-days";

/** iyzico tek çekim: yüzde 4,29 + 0,25 TL sabit (100 TL’de 4,54 TL kesinti). */
export const IYZICO_SINGLE_COMMISSION_RATE = 0.0429;
export const IYZICO_FIXED_FEE_TRY = 0.25;

/** Müşteriye yansıyan taksit oranı (iyzico üye işyeri paneli). */
export const IYZICO_INSTALLMENT_CUSTOMER_RATES: Record<number, number> = {
  2: 0.0861,
  3: 0.1077,
  6: 0.1822,
  9: 0.2674,
  12: 0.3639,
};

export type IyzicoPayoutStatus = "pending" | "paid";

export type IyzicoParsedPayment = {
  installment: number;
  paidPrice: number;
  price: number;
  commissionTotal: number;
  merchantPayoutAmount: number;
  blockageResolvedDateKey: string | null;
  systemTimeMs: number | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function roundMoney(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function parseDateKeyFromIyzico(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function firstItemTransaction(
  raw: Record<string, unknown>
): Record<string, unknown> | null {
  const items = raw.itemTransactions;
  if (!Array.isArray(items) || items.length === 0) return null;
  return asRecord(items[0]);
}

export function firstWednesdayOnOrAfter(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay();
  const add = (3 - weekday + 7) % 7;
  return addDaysToDateKey(dateKey, add);
}

/** İşlem tarihi + 28 günden sonraki (veya o günkü) ilk Çarşamba. */
export function resolveIyzicoPayoutDateKey(transactionDateKey: string): string {
  return firstWednesdayOnOrAfter(addDaysToDateKey(transactionDateKey, 28));
}

export function resolveIyzicoPayoutStatus(
  payoutDateKey: string,
  todayKey = getIstanbulDateKey()
): IyzicoPayoutStatus {
  return payoutDateKey <= todayKey ? "paid" : "pending";
}

export function calculateIyzicoCommissionFallback(
  paidPrice: number,
  installment: number
): { commissionTotal: number; merchantPayoutAmount: number } {
  const amount = Math.max(0, paidPrice);
  const count = Number.isFinite(installment) ? Math.round(installment) : 1;
  const customerRate = IYZICO_INSTALLMENT_CUSTOMER_RATES[count];

  if (count > 1 && customerRate != null) {
    const basket = roundMoney(amount / (1 + customerRate));
    const commissionTotal = roundMoney(amount - basket);
    return { commissionTotal, merchantPayoutAmount: basket };
  }

  const commissionTotal = roundMoney(
    amount * IYZICO_SINGLE_COMMISSION_RATE + IYZICO_FIXED_FEE_TRY
  );
  return {
    commissionTotal,
    merchantPayoutAmount: roundMoney(amount - commissionTotal),
  };
}

export function parseIyzicoPaymentRaw(
  rawResult: unknown,
  fallbackPaidPrice: number
): IyzicoParsedPayment {
  const raw = asRecord(rawResult) ?? {};
  const item = firstItemTransaction(raw);
  const installment = Math.max(1, Math.round(asNumber(raw.installment) ?? 1));
  const paidPrice =
    asNumber(raw.paidPrice) ??
    asNumber(item?.paidPrice) ??
    fallbackPaidPrice;
  const price = asNumber(raw.price) ?? asNumber(item?.price) ?? paidPrice;
  const commissionFee =
    asNumber(raw.iyziCommissionFee) ?? asNumber(item?.iyziCommissionFee) ?? 0;
  const commissionRateAmount =
    asNumber(raw.iyziCommissionRateAmount) ??
    asNumber(item?.iyziCommissionRateAmount) ??
    0;
  const merchantCommissionRateAmount =
    asNumber(raw.merchantCommissionRateAmount) ??
    asNumber(item?.merchantCommissionRateAmount) ??
    0;
  const fromApi = commissionFee + commissionRateAmount + merchantCommissionRateAmount;
  const payoutFromItem =
    asNumber(item?.merchantPayoutAmount) ??
    asNumber(asRecord(item?.convertedPayout)?.merchantPayoutAmount);
  const fallback = calculateIyzicoCommissionFallback(paidPrice, installment);
  const commissionTotal =
    fromApi > 0 ? roundMoney(fromApi) : fallback.commissionTotal;
  const merchantPayoutAmount =
    payoutFromItem != null
      ? roundMoney(payoutFromItem)
      : roundMoney(paidPrice - commissionTotal);

  return {
    installment,
    paidPrice: roundMoney(paidPrice),
    price: roundMoney(price),
    commissionTotal,
    merchantPayoutAmount,
    blockageResolvedDateKey: parseDateKeyFromIyzico(item?.blockageResolvedDate),
    systemTimeMs: asNumber(raw.systemTime),
  };
}

export function iyzicoTransactionDateKey(
  createdAt: Date,
  systemTimeMs: number | null
): string {
  if (systemTimeMs != null && systemTimeMs > 0) {
    const fromMs = systemTimeMs > 1e12 ? systemTimeMs : systemTimeMs * 1000;
    return getIstanbulDateKey(new Date(fromMs));
  }
  return getIstanbulDateKey(createdAt);
}

export function formatIyzicoMoney(amount: number): string {
  return `${amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TL`;
}

export function formatIyzicoDateKey(dateKey: string): string {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

export const IYZICO_PAYMENT_STATUS_LABEL: Record<IyzicoPayoutStatus, string> = {
  pending: "Beklemede",
  paid: "Ödendi",
};

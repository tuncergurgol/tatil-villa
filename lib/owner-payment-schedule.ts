/**
 * Villa tanımındaki ön ödeme / ev sahibi ödeme tipi adına göre
 * villa sahibine ödeme vadesi tarihini hesaplar.
 *
 * Örnekler: "Rezervasyon + 2", "Giriş + 1 gün"
 */
export type OwnerPaymentScheduleRule =
  | { kind: "reservation"; plusDays: number }
  | { kind: "check_in"; plusDays: number }
  | { kind: "check_out"; plusDays: number }
  | { kind: "unknown" };

export function parseOwnerPaymentScheduleRule(
  paymentTypeName: string | null | undefined
): OwnerPaymentScheduleRule {
  const name = (paymentTypeName ?? "").trim();
  if (!name) return { kind: "unknown" };

  const reservation = name.match(/rezervasyon\s*\+\s*(\d+)/i);
  if (reservation) {
    return { kind: "reservation", plusDays: Number(reservation[1]) || 0 };
  }
  if (/^rezervasyon$/i.test(name)) {
    return { kind: "reservation", plusDays: 0 };
  }

  const checkIn = name.match(/giri[sş]\s*\+\s*(\d+)/i);
  if (checkIn) {
    return { kind: "check_in", plusDays: Number(checkIn[1]) || 0 };
  }
  if (/^giri[sş]$/i.test(name)) {
    return { kind: "check_in", plusDays: 0 };
  }

  const checkOut = name.match(/[cç][ıi]k[ıi][sş]\s*\+\s*(\d+)/i);
  if (checkOut) {
    return { kind: "check_out", plusDays: Number(checkOut[1]) || 0 };
  }
  if (/^[cç][ıi]k[ıi][sş]$/i.test(name)) {
    return { kind: "check_out", plusDays: 0 };
  }

  return { kind: "unknown" };
}

function addDaysYmd(base: Date, plusDays: number): string {
  const d = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate())
  );
  d.setUTCDate(d.getUTCDate() + plusDays);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toUtcDateOnly(value: Date | string): Date | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    );
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(
      Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    );
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
  );
}

export function computeOwnerPaymentDueDate(input: {
  paymentTypeName: string | null | undefined;
  confirmationDate: Date | string | null | undefined;
  checkIn: Date | string | null | undefined;
  checkOut?: Date | string | null | undefined;
}): string {
  const rule = parseOwnerPaymentScheduleRule(input.paymentTypeName);
  if (rule.kind === "unknown") return "";

  if (rule.kind === "reservation") {
    const base = toUtcDateOnly(input.confirmationDate ?? "");
    if (!base) return "";
    return addDaysYmd(base, rule.plusDays);
  }

  if (rule.kind === "check_in") {
    const base = toUtcDateOnly(input.checkIn ?? "");
    if (!base) return "";
    return addDaysYmd(base, rule.plusDays);
  }

  const base = toUtcDateOnly(input.checkOut ?? "");
  if (!base) return "";
  return addDaysYmd(base, rule.plusDays);
}

/** Villa sahibine ödenecek: ön ödeme − komisyon */
export function computeOwnerPayableAmount(
  prepaymentAmount: number | null | undefined,
  commissionAmount: number | null | undefined
): number {
  const prepayment = Math.max(0, Math.round(Number(prepaymentAmount) || 0));
  const commission = Math.max(0, Math.round(Number(commissionAmount) || 0));
  return Math.max(0, prepayment - commission);
}

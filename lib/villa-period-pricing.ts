export type VillaPeriodCurrency = "TL" | "EUR" | "USD" | "GBP";

export type VillaPeriodAvailability = "available" | "closed";

export const VILLA_PERIOD_CURRENCIES: readonly VillaPeriodCurrency[] = [
  "TL",
  "EUR",
  "USD",
  "GBP",
] as const;

export type VillaPeriodPricingInput = {
  nightlyPrice: number;
  nightlyPriceWithoutCommission?: number | null;
  weeklyPrice?: number | null;
  commissionRate?: number | null;
  discount1Rate?: number | null;
  discount2Rate?: number | null;
  extraDiscountAmount?: number | null;
};

export type VillaPeriodPricingResult = {
  nightlyPrice: number;
  nightlyPriceWithoutCommission: number | null;
  weeklyPrice: number | null;
  commissionAmount: number | null;
  discount1Amount: number | null;
  discount2Amount: number | null;
  discountedNightlyPrice: number;
};

function toPositiveInt(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value) || value <= 0) return null;
  return Math.round(value);
}

function toRate(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value) || value < 0) return 0;
  return Math.min(100, Math.round(value));
}

export function parseAmountInput(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

/** Form/API girdilerinde TR binlik ayraçlı tutarları güvenli okur (`Number("7.000")` → 7 hatasını önler). */
export function parseOptionalPositiveInt(
  value: string | number | null | undefined
): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    return Math.round(value);
  }
  return parseAmountInput(String(value));
}

export function formatAmountInput(value: number | null | undefined): string {
  if (value == null || value <= 0) return "";
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

export function sanitizeAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return formatAmountInput(Number(digits));
}

export function deriveWithoutCommissionFromCommissioned(
  nightlyWithCommission: number,
  commissionRate: number
): number {
  if (nightlyWithCommission <= 0) return 0;
  const rate = toRate(commissionRate);
  return Math.round(
    nightlyWithCommission - (nightlyWithCommission * rate) / 100
  );
}

export function deriveCommissionedFromWithoutCommission(
  nightlyWithoutCommission: number,
  commissionRate: number
): number {
  if (nightlyWithoutCommission <= 0) return 0;
  const rate = toRate(commissionRate);
  if (rate >= 100) return nightlyWithoutCommission;
  return Math.round(nightlyWithoutCommission / (1 - rate / 100));
}

export type PriceSyncSource = "commissioned" | "withoutCommission" | "weekly";

export function syncPeriodPrices(input: {
  source: PriceSyncSource;
  commissioned?: number | null;
  withoutCommission?: number | null;
  weekly?: number | null;
  commissionRate: number;
}) {
  const rate = toRate(input.commissionRate);
  let nightly = 0;
  let without = 0;
  let weekly = 0;

  if (input.source === "commissioned") {
    nightly = input.commissioned ?? 0;
    if (nightly <= 0) return null;
    without = deriveWithoutCommissionFromCommissioned(nightly, rate);
    weekly = deriveWeeklyFromNightly(nightly) ?? 0;
  } else if (input.source === "withoutCommission") {
    without = input.withoutCommission ?? 0;
    if (without <= 0) return null;
    nightly = deriveCommissionedFromWithoutCommission(without, rate);
    weekly = deriveWeeklyFromNightly(nightly) ?? 0;
  } else {
    weekly = input.weekly ?? 0;
    if (weekly <= 0) return null;
    nightly = deriveNightlyFromWeekly(weekly);
    without = deriveWithoutCommissionFromCommissioned(nightly, rate);
  }

  return {
    nightlyPrice: formatAmountInput(nightly),
    nightlyPriceWithoutCommission: formatAmountInput(without),
    weeklyPrice: formatAmountInput(weekly),
  };
}

/** @deprecated Komisyonsuz fiyattan komisyonlu türetmek için deriveCommissionedFromWithoutCommission kullanın */
export function applyCommissionToBase(
  basePrice: number,
  commissionRate: number
): number {
  return deriveCommissionedFromWithoutCommission(basePrice, commissionRate);
}

export function deriveWeeklyFromNightly(nightlyPrice: number): number | null {
  if (nightlyPrice <= 0) return null;
  return nightlyPrice * 7;
}

export function deriveNightlyFromWeekly(weeklyPrice: number): number {
  if (weeklyPrice <= 0) return 0;
  return Math.round(weeklyPrice / 7);
}

export function calculateCommissionAmount(
  nightlyPrice: number,
  nightlyPriceWithoutCommission: number | null
): number | null {
  if (
    nightlyPriceWithoutCommission == null ||
    nightlyPriceWithoutCommission <= 0 ||
    nightlyPrice <= 0
  ) {
    return null;
  }

  return Math.max(0, nightlyPrice - nightlyPriceWithoutCommission);
}

export function hasActiveDiscount(input: {
  discount1Rate?: number | null;
  discount2Rate?: number | null;
  extraDiscountAmount?: number | null;
}): boolean {
  return (
    toRate(input.discount1Rate) > 0 ||
    toRate(input.discount2Rate) > 0 ||
    (toPositiveInt(input.extraDiscountAmount) ?? 0) > 0
  );
}

export function resolveDayDiscountedPrice(
  nightlyPrice: number,
  discount1Rate?: number | null,
  discount2Rate?: number | null,
  extraDiscountAmount?: number | null
): number {
  if (nightlyPrice <= 0) return 0;
  if (
    !hasActiveDiscount({
      discount1Rate,
      discount2Rate,
      extraDiscountAmount,
    })
  ) {
    return nightlyPrice;
  }

  const discount = calculateDiscountAmounts(
    nightlyPrice,
    toRate(discount1Rate),
    toRate(discount2Rate),
    toPositiveInt(extraDiscountAmount) ?? 0
  );

  return discount.discountedNightlyPrice > 0
    ? discount.discountedNightlyPrice
    : nightlyPrice;
}

export function calculateDiscountAmounts(
  nightlyPrice: number,
  discount1Rate: number,
  discount2Rate: number,
  extraDiscountAmount: number
) {
  const base = nightlyPrice > 0 ? nightlyPrice : 0;
  const discount1Amount =
    base > 0 && discount1Rate > 0
      ? Math.round((base * toRate(discount1Rate)) / 100)
      : null;
  const afterFirst = base - (discount1Amount ?? 0);
  const discount2Amount =
    afterFirst > 0 && discount2Rate > 0
      ? Math.round((afterFirst * toRate(discount2Rate)) / 100)
      : null;
  const extra = toPositiveInt(extraDiscountAmount) ?? 0;
  const discountedNightlyPrice = Math.max(
    0,
    base - (discount1Amount ?? 0) - (discount2Amount ?? 0) - extra
  );

  return {
    discount1Amount,
    discount2Amount,
    discountedNightlyPrice,
  };
}

export function resolveVillaPeriodPricing(
  input: VillaPeriodPricingInput
): VillaPeriodPricingResult {
  const commissionRate = toRate(input.commissionRate);
  const nightlyWithCommission = toPositiveInt(input.nightlyPrice) ?? 0;
  const nightlyWithoutCommission =
    toPositiveInt(input.nightlyPriceWithoutCommission) ??
    (nightlyWithCommission > 0
      ? deriveWithoutCommissionFromCommissioned(
          nightlyWithCommission,
          commissionRate
        )
      : null);
  const weeklyPrice =
    toPositiveInt(input.weeklyPrice) ??
    (nightlyWithCommission > 0
      ? deriveWeeklyFromNightly(nightlyWithCommission)
      : null);
  const extraDiscountAmount = toPositiveInt(input.extraDiscountAmount) ?? 0;

  const discount = calculateDiscountAmounts(
    nightlyWithCommission,
    toRate(input.discount1Rate),
    toRate(input.discount2Rate),
    extraDiscountAmount
  );

  return {
    nightlyPrice: nightlyWithCommission,
    nightlyPriceWithoutCommission: nightlyWithoutCommission,
    weeklyPrice,
    commissionAmount: calculateCommissionAmount(
      nightlyWithCommission,
      nightlyWithoutCommission
    ),
    discount1Amount: discount.discount1Amount,
    discount2Amount: discount.discount2Amount,
    discountedNightlyPrice:
      discount.discountedNightlyPrice > 0
        ? discount.discountedNightlyPrice
        : nightlyWithCommission,
  };
}

export function formatMoneyAmount(value: number | null | undefined): string {
  if (value == null || value <= 0) return "—";
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

export function parseOptionalInt(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value) return null;
  return parseAmountInput(value);
}

export function parseRequiredPositiveInt(
  raw: FormDataEntryValue | null,
  fieldLabel: string
): number {
  const parsed = parseOptionalInt(raw);
  if (parsed == null || parsed <= 0) {
    throw new Error(`${fieldLabel} pozitif olmalı`);
  }
  return parsed;
}

export function parseCurrency(
  raw: FormDataEntryValue | null
): VillaPeriodCurrency {
  const value = String(raw ?? "TL").trim().toUpperCase();
  if (VILLA_PERIOD_CURRENCIES.includes(value as VillaPeriodCurrency)) {
    return value as VillaPeriodCurrency;
  }
  return "TL";
}

export function parseAvailability(
  _raw: FormDataEntryValue | null
): VillaPeriodAvailability {
  return "available";
}

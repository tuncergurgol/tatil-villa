import type { StayQuote } from "@/lib/stay-quote";
import {
  STAY_OPTIONAL_FEE_OPTIONS,
  STAY_PERIOD_POOL_OPTIONAL_FEE_KEYS,
  computeStayExtrasTotal,
  positiveFee,
  resolveExtraBedFeeAmount,
  resolveOptionalFeeAmount,
  resolveOverCapacityGuests,
  resolvePoolHeatingStayAmount,
  shouldUsePeriodPoolOptionalFees,
  type HeatedPoolOption,
  type PoolHeatingSelections,
  type StayFeeSelections,
  type StayOptionalFeeKey,
  type StayPeriodFees,
} from "@/lib/stay-period-fees";
import { villaPublicPath } from "@/lib/villa-public-path";

function formatMoneyTl(value: number, currency = "TL"): string {
  const amount = value.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
  if (currency === "TL" || currency === "TRY") return `${amount} TL`;
  return `${amount} ${currency}`;
}

/** YYYY-MM-DD → DD.MM.YYYY */
export function formatStayDateTr(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) return dateKey;
  return `${day}.${month}.${year}`;
}

export function buildVillaStayShareUrl(input: {
  origin: string;
  slug: string;
  checkIn?: string | null;
  checkOut?: string | null;
  adults?: number | null;
}): string {
  const base = input.origin.replace(/\/+$/g, "");
  const path = villaPublicPath(input.slug);
  const params = new URLSearchParams();
  if (input.checkIn && input.checkOut) {
    params.set("giristarihi", formatStayDateTr(input.checkIn));
    params.set("cikistarihi", formatStayDateTr(input.checkOut));
    if (input.adults != null && input.adults > 0) {
      params.set("kisi", String(input.adults));
    }
  }
  const query = params.toString();
  return query ? `${base}${path}?${query}` : `${base}${path}`;
}

export type BuildVillaReservationShareTextInput = {
  brandName: string;
  villaName: string;
  slug: string;
  origin: string;
  checkIn?: string | null;
  checkOut?: string | null;
  adults?: number;
  children?: number;
  pets?: number;
  baseCapacity?: number;
  quote?: StayQuote | null;
  fees?: StayPeriodFees | null;
  selections?: StayFeeSelections;
  heatedPools?: HeatedPoolOption[];
  poolHeatingSelections?: PoolHeatingSelections;
};

/**
 * Rezervasyon Yap paneli Paylaş metni.
 * Tarih yoksa yalnızca villa detay linki; tarih + geçerli hesap varsa tablo özeti + link.
 */
export function buildVillaReservationShareText(
  input: BuildVillaReservationShareTextInput
): string {
  const brand = input.brandName.trim() || "Tatildeyiz";
  const villa = input.villaName.trim() || "Villa";
  const hasDates = Boolean(input.checkIn && input.checkOut);
  const quote = input.quote;
  const hasQuote = Boolean(quote && quote.valid && quote.nights > 0);

  const url = buildVillaStayShareUrl({
    origin: input.origin,
    slug: input.slug,
    checkIn: hasDates ? input.checkIn : null,
    checkOut: hasDates ? input.checkOut : null,
    adults: hasDates ? (input.adults ?? null) : null,
  });

  const lines: string[] = [`${brand} - ${villa},`, ""];

  if (hasDates && input.checkIn && input.checkOut) {
    const nights = hasQuote
      ? quote!.nights
      : Math.max(
          0,
          Math.round(
            (new Date(`${input.checkOut}T12:00:00`).getTime() -
              new Date(`${input.checkIn}T12:00:00`).getTime()) /
              86_400_000
          )
        );

    lines.push(`Giriş Tarihi : ${formatStayDateTr(input.checkIn)}`);
    lines.push(`Çıkış Tarihi : ${formatStayDateTr(input.checkOut)}`);
    if (nights > 0) {
      lines.push(`Gece Sayısı : ${nights} Gece`);
    }
    lines.push("");

    if (hasQuote && quote) {
      const currency = quote.currency;
      const pets = input.pets ?? 0;
      const adults = input.adults ?? 2;
      const children = input.children ?? 0;
      const baseCapacity = input.baseCapacity ?? 0;
      const selections = input.selections ?? {};
      const heatedPools = input.heatedPools ?? [];
      const poolHeatingSelections = input.poolHeatingSelections ?? {};
      const fees = input.fees ?? {
        cleaningFee: quote.cleaningFee,
        damageDeposit: null,
        petCleaningFee: null,
        petDamageDeposit: null,
        underfloorHeatingFee: null,
        extraBedFee: null,
        poolHeatingPrivateFee: null,
        poolHeatingIndoorFee: null,
        poolHeatingKidsFee: null,
      };

      const extrasTotal = computeStayExtrasTotal({
        pets,
        nights: quote.nights,
        adults,
        children,
        baseCapacity,
        fees,
        selections,
        heatedPools,
        poolHeatingSelections,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
      });
      const grandTotal =
        quote.accommodationTotal + quote.cleaningFee + extrasTotal;
      const prepaymentAmount = Math.round(
        (quote.accommodationTotal * quote.prepaymentRate) / 100
      );
      const checkInPayment = Math.max(0, grandTotal - prepaymentAmount);

      lines.push("Fiyat detayları aşağıdaki gibidir:");
      lines.push(
        `KONAKLAMA BEDELİ (${quote.nights} GECE): ${formatMoneyTl(quote.accommodationTotal, currency)}`
      );

      const cleaningAmount = quote.cleaningFee;
      const showCleaning =
        cleaningAmount > 0 ||
        (quote.cleaningDayCount != null && quote.cleaningDayCount > 0);
      if (showCleaning) {
        lines.push(
          `TEMİZLİK ÜCRETİ: ${formatMoneyTl(cleaningAmount, currency)}`
        );
      }

      const petCleaning = pets > 0 ? positiveFee(fees.petCleaningFee) : 0;
      if (petCleaning > 0) {
        lines.push(
          `EVCİL HAYVAN TEMİZLİK BEDELİ: ${formatMoneyTl(petCleaning, currency)}`
        );
      }

      const overCapacityGuests = resolveOverCapacityGuests(
        adults,
        children,
        baseCapacity
      );
      const extraBedUnit = positiveFee(fees.extraBedFee);
      const extraBedTotal = resolveExtraBedFeeAmount({
        overCapacityGuests,
        nights: quote.nights,
        unitFee: extraBedUnit,
      });
      if (extraBedTotal > 0) {
        lines.push(
          `EK YATAK BEDELİ: ${formatMoneyTl(extraBedTotal, currency)}`
        );
      }

      for (const option of STAY_OPTIONAL_FEE_OPTIONS) {
        if (
          !shouldUsePeriodPoolOptionalFees(heatedPools) &&
          STAY_PERIOD_POOL_OPTIONAL_FEE_KEYS.has(option.key)
        ) {
          continue;
        }
        if (!selections[option.key]) continue;
        const unit = positiveFee(fees[option.key]);
        if (unit <= 0) continue;
        const amount = resolveOptionalFeeAmount(
          option.key as StayOptionalFeeKey,
          unit,
          quote.nights
        );
        if (amount <= 0) continue;
        lines.push(
          `${option.label.toLocaleUpperCase("tr-TR")}: ${formatMoneyTl(amount, currency)}`
        );
      }

      if (input.checkIn && input.checkOut) {
        for (const pool of heatedPools) {
          if (!poolHeatingSelections[pool.id]) continue;
          const pricing = resolvePoolHeatingStayAmount({
            periods: pool.periods,
            checkIn: input.checkIn,
            checkOut: input.checkOut,
          });
          if (pricing.total <= 0) continue;
          lines.push(
            `HAVUZ ISITMA (${pool.name.toLocaleUpperCase("tr-TR")}): ${formatMoneyTl(
              pricing.total,
              pricing.currency || currency
            )}`
          );
        }
      }

      lines.push(`TOPLAM: ${formatMoneyTl(grandTotal, currency)}`);
      lines.push("");
      lines.push(
        `ÖN ÖDEME TUTARI: ${formatMoneyTl(prepaymentAmount, currency)}`
      );
      lines.push(
        `GİRİŞTE ÖDENECEK TUTAR: ${formatMoneyTl(checkInPayment, currency)}`
      );

      const damageDeposit = positiveFee(fees.damageDeposit);
      const petDamageDeposit =
        pets > 0 ? positiveFee(fees.petDamageDeposit) : 0;
      if (damageDeposit > 0 || petDamageDeposit > 0) {
        lines.push("");
        if (damageDeposit > 0) {
          lines.push(
            `HASAR DEPOZİTOSU: ${formatMoneyTl(damageDeposit, currency)}`
          );
        }
        if (petDamageDeposit > 0) {
          lines.push(
            `EVCİL HAYVAN HASAR DEPOZİTOSU: ${formatMoneyTl(petDamageDeposit, currency)}`
          );
        }
      }
      lines.push("");
    }
  }

  lines.push(`${url} linkiyle ulaşabilirsiniz.`);
  lines.push("");
  lines.push(brand);

  return lines.join("\n");
}

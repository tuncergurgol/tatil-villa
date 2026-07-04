import type { VillaDayOccupancy, VillaPeriodCurrency } from "@prisma/client";
import {
  calculateDiscountAmounts,
  deriveWeeklyFromNightly,
  deriveWithoutCommissionFromCommissioned,
} from "@/lib/villa-period-pricing";
import {
  compareDates,
  enumerateDateKeys,
  parseDateKey,
  startOfDay,
  toDateKey,
} from "@/lib/villa-period-calendar";
import type { VillaPeriodDayPricingSnapshot } from "@/lib/villa-period-days";
import type {
  TatildeyizProperty,
  TatildeyizPropertyBooking,
  TatildeyizPropertyDiscount,
  TatildeyizPropertyPeriodPrice,
} from "@/lib/tatildeyiz-property";

const CURRENCY_BY_ID: Record<number, VillaPeriodCurrency> = {
  1: "TL",
  2: "EUR",
  3: "USD",
  4: "GBP",
};

const BOOKED_STATUS_IDS = new Set([7, 8, 9, 10, 11, 12]);
const OPTION_STATUS_IDS = new Set([5, 6]);

export type MappedVillaPricePeriod = {
  sourceId: number;
  startDate: Date;
  endDate: Date;
  availability: "available";
  nightlyPrice: number;
  nightlyPriceCurrency: VillaPeriodCurrency;
  weeklyPrice: number | null;
  prepaymentRate: number | null;
  commissionRate: number | null;
  nightlyPriceWithoutCommission: number | null;
  discountedNightlyPrice: number;
  minStayNights: number | null;
  cleaningDayCount: number | null;
  cleaningFee: number | null;
  cleaningFeeCurrency: VillaPeriodCurrency;
  damageDeposit: number | null;
  damageDepositCurrency: VillaPeriodCurrency;
  petCleaningFee: number | null;
  petCleaningFeeCurrency: VillaPeriodCurrency;
  petDamageDeposit: number | null;
  petDamageDepositCurrency: VillaPeriodCurrency;
  underfloorHeatingFee: number | null;
  underfloorHeatingFeeCurrency: VillaPeriodCurrency;
  extraBedFee: number | null;
  extraBedFeeCurrency: VillaPeriodCurrency;
  discount1Rate: number | null;
  discount2Rate: number | null;
  extraDiscountAmount: number | null;
  weekendPrice: number | null;
  weekendDays: number[];
  weekendMinStayNights: number | null;
  childFee02: number | null;
  childFee02Currency: VillaPeriodCurrency;
  childFee03_09: number | null;
  childFee03_09Currency: VillaPeriodCurrency;
};

function mapCurrency(
  currency: { value?: string } | null | undefined,
  currencyId?: number | null
): VillaPeriodCurrency {
  const fromId =
    currencyId != null ? CURRENCY_BY_ID[currencyId] : undefined;
  if (fromId) return fromId;

  const value = currency?.value?.toUpperCase();
  if (value === "EUR" || value === "USD" || value === "GBP") return value;
  return "TL";
}

function positiveInt(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

function parseIsoDate(value: string): Date {
  const dateKey = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return parseDateKey(dateKey);
  }
  return startOfDay(new Date(value));
}

function getDiscountRates(
  period: TatildeyizPropertyPeriodPrice,
  discounts: TatildeyizPropertyDiscount[]
) {
  const match =
    discounts.find((item) => item.propertyPeriodPriceId === period.id) ??
    discounts.find((item) => {
      if (!item.periodStart || !item.periodEnd) return false;
      const start = parseIsoDate(item.periodStart);
      const end = parseIsoDate(item.periodEnd);
      const periodStart = parseIsoDate(period.periodStart);
      const periodEnd = parseIsoDate(period.periodEnd);
      return (
        compareDates(start, periodStart) === 0 &&
        compareDates(end, periodEnd) === 0
      );
    });

  if (!match) {
    return {
      discount1Rate: null,
      discount2Rate: null,
      extraDiscountAmount: null,
    };
  }

  return {
    discount1Rate: positiveInt(
      match.discount1Rate ?? match.indirim1Orani ?? null
    ),
    discount2Rate: positiveInt(
      match.discount2Rate ?? match.indirim2Orani ?? null
    ),
    extraDiscountAmount: positiveInt(
      match.extraDiscountAmount ?? match.indirimTutari ?? null
    ),
  };
}

export function mapTatildeyizPeriod(
  period: TatildeyizPropertyPeriodPrice,
  discounts: TatildeyizPropertyDiscount[]
): MappedVillaPricePeriod | null {
  const nightlyPrice = positiveInt(period.price);
  if (!nightlyPrice) return null;

  const startDate = parseIsoDate(period.periodStart);
  const endDate = parseIsoDate(period.periodEnd);
  if (compareDates(startDate, endDate) > 0) return null;

  const commissionRate = positiveInt(period.komisyonOrani);
  const nightlyPriceWithoutCommission =
    commissionRate != null
      ? deriveWithoutCommissionFromCommissioned(nightlyPrice, commissionRate)
      : null;

  const discountRates = getDiscountRates(period, discounts);
  const discountPreview = calculateDiscountAmounts(
    nightlyPrice,
    discountRates.discount1Rate ?? 0,
    discountRates.discount2Rate ?? 0,
    discountRates.extraDiscountAmount ?? 0
  );

  const nightlyPriceCurrency = mapCurrency(period.currency, period.currencyId);

  return {
    sourceId: period.id,
    startDate,
    endDate,
    availability: "available",
    nightlyPrice,
    nightlyPriceCurrency,
    weeklyPrice: deriveWeeklyFromNightly(nightlyPrice),
    prepaymentRate: positiveInt(period.onOdemeOrani),
    commissionRate,
    nightlyPriceWithoutCommission,
    discountedNightlyPrice: discountPreview.discountedNightlyPrice,
    minStayNights: positiveInt(period.minimumKonaklamaSuresi),
    cleaningDayCount: positiveInt(period.temizlikGunSayisi),
    cleaningFee: positiveInt(period.cleaningFee),
    cleaningFeeCurrency: mapCurrency(null, period.cleaningFeeCurrencyId),
    damageDeposit: positiveInt(period.hasarDepozitosu),
    damageDepositCurrency: mapCurrency(null, period.hasarDepozitosuCurrencyId),
    petCleaningFee: positiveInt(period.evcilHayvanTemizlikBedeli),
    petCleaningFeeCurrency: mapCurrency(
      null,
      period.evcilHayvanTemizlikBedeliCurrencyId
    ),
    petDamageDeposit: positiveInt(period.evcilHayvanHasarDepozitosu),
    petDamageDepositCurrency: mapCurrency(
      null,
      period.evcilHayvanHasarDepozitosuCurrencyId
    ),
    underfloorHeatingFee: positiveInt(period.yerdenIsitmaBedeli),
    underfloorHeatingFeeCurrency: mapCurrency(
      null,
      period.yerdenIsitmaBedeliCurrencyId
    ),
    extraBedFee: positiveInt(period.ekYatakUcreti),
    extraBedFeeCurrency: mapCurrency(null, period.ekYatakUcretiCurrencyId),
    discount1Rate: discountRates.discount1Rate,
    discount2Rate: discountRates.discount2Rate,
    extraDiscountAmount: discountRates.extraDiscountAmount,
    weekendPrice: positiveInt(period.weekendPrice),
    weekendDays: Array.isArray(period.weekendDays) ? period.weekendDays : [],
    weekendMinStayNights: positiveInt(period.weekendMinimumStay),
    childFee02: positiveInt(period.cocuk02YasUcreti),
    childFee02Currency: mapCurrency(null, period.cocuk02YasUcretiCurrencyId),
    childFee03_09: positiveInt(period.cocuk03_09YasUcreti),
    childFee03_09Currency: mapCurrency(
      null,
      period.cocuk03_09YasUcretiCurrencyId
    ),
  };
}

export function mapTatildeyizPropertyPeriods(property: TatildeyizProperty) {
  return property.propertyPeriodPrices
    .map((period) => mapTatildeyizPeriod(period, property.propertyDiscounts))
    .filter((period): period is MappedVillaPricePeriod => period != null)
    .sort((a, b) => compareDates(a.startDate, b.startDate));
}

function bookingOccupancy(statusId: number): VillaDayOccupancy {
  if (OPTION_STATUS_IDS.has(statusId)) return "OPTION";
  if (BOOKED_STATUS_IDS.has(statusId)) return "BOOKED";
  return "BOOKED";
}

export function getBookingNightDateKeys(booking: TatildeyizPropertyBooking) {
  const checkIn = parseIsoDate(booking.checkIn);
  const checkOut = parseIsoDate(booking.checkOut);
  const keys: string[] = [];
  const cursor = new Date(checkIn);

  while (compareDates(cursor, checkOut) < 0) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export function buildOccupancyByDateKey(property: TatildeyizProperty) {
  const map = new Map<string, VillaDayOccupancy>();

  for (const booking of property.bookings) {
    const occupancy = bookingOccupancy(booking.statusId);
    for (const dateKey of getBookingNightDateKeys(booking)) {
      const existing = map.get(dateKey);
      if (existing === "BOOKED") continue;
      map.set(dateKey, occupancy);
    }
  }

  return map;
}

function isWeekendDate(period: MappedVillaPricePeriod, date: Date): boolean {
  const day = date.getDay();
  return (
    period.weekendPrice != null &&
    period.weekendDays.length > 0 &&
    period.weekendDays.includes(day)
  );
}

export function mappedPeriodToPeriodData(period: MappedVillaPricePeriod) {
  const { sourceId: _sourceId, ...data } = period;
  return data;
}

export function buildDaySnapshotForDate(
  period: MappedVillaPricePeriod,
  date: Date,
  occupancyStatus: VillaDayOccupancy = "EMPTY"
): VillaPeriodDayPricingSnapshot {
  const weekend = isWeekendDate(period, date);

  return {
    availability: period.availability,
    nightlyPrice: weekend ? period.weekendPrice! : period.nightlyPrice,
    nightlyPriceCurrency: period.nightlyPriceCurrency,
    nightlyPriceWithoutCommission: period.nightlyPriceWithoutCommission,
    discountedNightlyPrice: weekend
      ? period.weekendPrice!
      : period.discountedNightlyPrice,
    weeklyPrice: period.weeklyPrice,
    prepaymentRate: period.prepaymentRate,
    commissionRate: period.commissionRate,
    minStayNights: period.minStayNights,
    cleaningDayCount: period.cleaningDayCount,
    cleaningFee: period.cleaningFee,
    cleaningFeeCurrency: period.cleaningFeeCurrency,
    damageDeposit: period.damageDeposit,
    damageDepositCurrency: period.damageDepositCurrency,
    petCleaningFee: period.petCleaningFee,
    petCleaningFeeCurrency: period.petCleaningFeeCurrency,
    petDamageDeposit: period.petDamageDeposit,
    petDamageDepositCurrency: period.petDamageDepositCurrency,
    underfloorHeatingFee: period.underfloorHeatingFee,
    underfloorHeatingFeeCurrency: period.underfloorHeatingFeeCurrency,
    extraBedFee: period.extraBedFee,
    extraBedFeeCurrency: period.extraBedFeeCurrency,
    discount1Rate: period.discount1Rate,
    discount2Rate: period.discount2Rate,
    extraDiscountAmount: period.extraDiscountAmount,
    weekendPrice: period.weekendPrice,
    weekendDays: period.weekendDays,
    weekendMinStayNights: period.weekendMinStayNights,
    childFee02: period.childFee02,
    childFee02Currency: period.childFee02Currency,
    childFee03_09: period.childFee03_09,
    childFee03_09Currency: period.childFee03_09Currency,
    occupancyStatus,
  };
}

export function buildDaySnapshotsForPeriod(
  period: MappedVillaPricePeriod,
  occupancyByDateKey?: Map<string, VillaDayOccupancy>
) {
  const dateKeys = enumerateDateKeys(
    toDateKey(period.startDate),
    toDateKey(period.endDate)
  );

  return dateKeys.map((dateKey) => {
    const date = parseDateKey(dateKey);
    const occupancyStatus = occupancyByDateKey?.get(dateKey) ?? "EMPTY";

    return {
      dateKey,
      date,
      snapshot: buildDaySnapshotForDate(period, date, occupancyStatus),
    };
  });
}

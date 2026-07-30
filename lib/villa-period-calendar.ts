import type {
  VillaPeriodAvailability,
  VillaPeriodCurrency,
} from "@/lib/villa-period-pricing";

export type VillaPricePeriodItem = {
  id: string;
  villaId: string;
  startDate: Date;
  endDate: Date;
  availability: VillaPeriodAvailability;
  nightlyPrice: number;
  nightlyPriceCurrency: VillaPeriodCurrency;
  weeklyPrice: number | null;
  prepaymentRate: number | null;
  commissionRate: number | null;
  nightlyPriceWithoutCommission: number | null;
  discountedNightlyPrice: number | null;
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
  poolHeatingPrivateFee: number | null;
  poolHeatingPrivateFeeCurrency: VillaPeriodCurrency;
  poolHeatingIndoorFee: number | null;
  poolHeatingIndoorFeeCurrency: VillaPeriodCurrency;
  poolHeatingKidsFee: number | null;
  poolHeatingKidsFeeCurrency: VillaPeriodCurrency;
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

const WEEKDAY_LABELS = ["Pts", "Sal", "Çar", "Per", "Cum", "Cts", "Paz"] as const;

const MONTH_LABELS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

export function formatPeriodPrice(price: number, currency = "TL"): string {
  return `${formatNightlyAmount(Math.round(price))} ${currency}`;
}

export function formatNightlyAmount(price: number): string {
  return price.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

export function formatPlainPrice(price: number, currency = "TL"): string {
  const rounded = Math.round(price);
  return `${formatNightlyAmount(rounded)} ${currency}`;
}

export function getDisplayNightlyPrice(period: VillaPricePeriodItem): number {
  return period.discountedNightlyPrice ?? period.nightlyPrice;
}

export function getMonthsBetweenDates(startDate: Date, endDate: Date) {
  const months: { year: number; month: number }[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cursor <= end) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

export function formatPeriodDate(date: Date): string {
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatPeriodRange(startDate: Date, endDate: Date): string {
  return `${formatPeriodDate(startDate)} - ${formatPeriodDate(endDate)}`;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Prisma @db.Date alanlarına yazarken timezone kaymasını önler. */
export function dateKeyToDbDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

/** Takvim Date değerini Prisma @db.Date yazımına çevirir. */
export function toDbDate(date: Date): Date {
  return dateKeyToDbDate(toDateKey(startOfDay(date)));
}

/** Prisma @db.Date alanından okunan tarihi YYYY-MM-DD anahtarına çevirir. */
export function dbDateToDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function todayDate(): Date {
  return startOfDay(new Date());
}

export function compareDates(a: Date, b: Date): number {
  return startOfDay(a).getTime() - startOfDay(b).getTime();
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = startOfDay(parseDateKey(dateKey));
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

const MONTH_LENGTHS_WITH_MONTH_END = new Set([28, 29, 31]);

/** Periyot ekle: başlangıç + 30 gün; sonuç ayın 1'inde ve ay 28/29/31 günlükse bir önceki ayın son günü. */
export function getDefaultPeriodEndDate(startDateKey: string): string {
  if (!startDateKey) return "";

  const plus30 = startOfDay(parseDateKey(addDaysToDateKey(startDateKey, 30)));

  if (plus30.getDate() === 1) {
    const endYear = plus30.getFullYear();
    const endMonth = plus30.getMonth();
    const daysInEndMonth = getDaysInMonth(endYear, endMonth);

    if (MONTH_LENGTHS_WITH_MONTH_END.has(daysInEndMonth)) {
      return toDateKey(new Date(endYear, endMonth, 0));
    }
  }

  return toDateKey(plus30);
}

export function getLatestPeriodByEndDate(
  periods: VillaPricePeriodItem[]
): VillaPricePeriodItem | null {
  if (periods.length === 0) return null;

  return periods.reduce((latest, period) =>
    compareDates(period.endDate, latest.endDate) > 0 ? period : latest
  );
}

/** Son periyodun bitişinden sonraki gün (YYYY-MM-DD). */
export function getNextPeriodStartDate(
  periods: VillaPricePeriodItem[]
): string {
  const latest = getLatestPeriodByEndDate(periods);
  if (!latest) return "";

  const endKey = dbDateToDateKey(startOfDay(new Date(latest.endDate)));
  return addDaysToDateKey(endKey, 1);
}

export type NewPeriodPrefill = {
  templatePeriod: VillaPricePeriodItem | null;
  dateRange: { startDate: string; endDate: string } | null;
};

/** Yeni periyot formu: son periyodun bilgileri + ardışık tarih aralığı (+30 gün). */
export function buildNewPeriodPrefill(
  periods: VillaPricePeriodItem[]
): NewPeriodPrefill {
  const templatePeriod = getLatestPeriodByEndDate(periods);
  if (!templatePeriod) {
    return { templatePeriod: null, dateRange: null };
  }

  const startDate = getNextPeriodStartDate(periods);
  return {
    templatePeriod,
    dateRange: {
      startDate,
      endDate: getDefaultPeriodEndDate(startDate),
    },
  };
}

export function enumerateDateKeys(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  const cursor = startOfDay(parseDateKey(startKey));
  const end = startOfDay(parseDateKey(endKey));

  while (compareDates(cursor, end) <= 0) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  const value = startOfDay(date).getTime();
  return (
    value >= startOfDay(startDate).getTime() &&
    value <= startOfDay(endDate).getTime()
  );
}

export function getMonthLabel(year: number, month: number): string {
  return `${MONTH_LABELS[month]} ${year}`;
}

export function getWeekdayLabels(): readonly string[] {
  return WEEKDAY_LABELS;
}

export type CalendarCell = {
  date: Date;
  inCurrentMonth: boolean;
};

export function buildNextMonthFirstWeekRow(
  year: number,
  month: number
): Array<CalendarCell | null> {
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const row: Array<CalendarCell | null> = Array.from({ length: 7 }, () => null);

  for (let dayNumber = 3; dayNumber <= 9; dayNumber += 1) {
    const date = new Date(nextYear, nextMonth, dayNumber);
    const column = (date.getDay() + 6) % 7;
    row[column] = {
      date,
      inCurrentMonth: false,
    };
  }

  return row;
}

export function getAdjacentMonthLabel(year: number, month: number, offset: -1 | 1) {
  const date = new Date(year, month + offset, 1);
  return getMonthLabel(date.getFullYear(), date.getMonth());
}

export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const mondayBasedIndex = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - mondayBasedIndex);
  const cells: CalendarCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index
    );
    cells.push({
      date,
      inCurrentMonth: date.getMonth() === month,
    });
  }

  const trailingWeekEmpty = cells
    .slice(-7)
    .every((cell) => !cell.inCurrentMonth && cell.date > lastDay);
  if (trailingWeekEmpty) {
    return cells.slice(0, -7);
  }

  return cells;
}

export function findPeriodForDate(
  date: Date,
  periods: VillaPricePeriodItem[]
): VillaPricePeriodItem | null {
  return (
    periods.find((period) =>
      isDateInRange(date, period.startDate, period.endDate)
    ) ?? null
  );
}

export function sortPeriodsByDate(periods: VillaPricePeriodItem[]): VillaPricePeriodItem[] {
  return [...periods].sort(
    (left, right) => compareDates(left.startDate, right.startDate)
  );
}

export function splitPeriodsByToday(periods: VillaPricePeriodItem[]) {
  const today = todayDate();
  const sorted = sortPeriodsByDate(periods);

  const currentAndFuture = sorted.filter(
    (period) => compareDates(period.endDate, today) >= 0
  );
  const past = sorted.filter((period) => compareDates(period.endDate, today) < 0);

  return { currentAndFuture, past };
}

export function periodsOverlap(
  left: Pick<VillaPricePeriodItem, "startDate" | "endDate">,
  right: Pick<VillaPricePeriodItem, "startDate" | "endDate">
): boolean {
  return (
    compareDates(left.startDate, right.endDate) <= 0 &&
    compareDates(right.startDate, left.endDate) <= 0
  );
}

export function getPeriodSegmentsForMonth(
  periods: VillaPricePeriodItem[],
  year: number,
  month: number
) {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  return sortPeriodsByDate(periods)
    .filter((period) => periodsOverlap(period, { startDate: monthStart, endDate: monthEnd }))
    .map((period) => ({
      period,
      segmentStart:
        compareDates(period.startDate, monthStart) < 0
          ? monthStart
          : period.startDate,
      segmentEnd:
        compareDates(period.endDate, monthEnd) > 0 ? monthEnd : period.endDate,
    }));
}

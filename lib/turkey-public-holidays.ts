export const TURKEY_HOLIDAY_YEAR_START = 2025;
export const TURKEY_HOLIDAY_YEAR_END = 2040;

export type TurkeyHolidayKind =
  | "NEW_YEAR"
  | "NATIONAL_SOVEREIGNTY"
  | "LABOR_DAY"
  | "YOUTH_SPORTS"
  | "DEMOCRACY"
  | "VICTORY"
  | "REPUBLIC_EVE"
  | "REPUBLIC"
  | "RAMADAN_EVE"
  | "RAMADAN"
  | "SACRIFICE_EVE"
  | "SACRIFICE";

export type TurkeyPublicHoliday = {
  date: string;
  name: string;
  shortName: string;
  kind: TurkeyHolidayKind;
  halfDay?: boolean;
  dayIndex?: number;
};

/**
 * Ramazan Bayramı 1. gün (1 Şevval). 2025–2027 Diyanet/takvim kaynaklı;
 * sonraki yıllar yaygın hicri dönüşüme göredir, hilal ile 1 gün kayabilir.
 */
const RAMADAN_FIRST_DAYS = [
  "2025-03-30",
  "2026-03-20",
  "2027-03-09",
  "2028-02-26",
  "2029-02-14",
  "2030-02-04",
  "2031-01-24",
  "2032-01-14",
  "2033-01-02",
  "2033-12-23",
  "2034-12-12",
  "2035-12-01",
  "2036-11-19",
  "2037-11-08",
  "2038-10-29",
  "2039-10-19",
  "2040-10-07",
] as const;

/** Kurban Bayramı 1. gün (10 Zilhicce). */
const SACRIFICE_FIRST_DAYS = [
  "2025-06-06",
  "2026-05-27",
  "2027-05-16",
  "2028-05-05",
  "2029-04-24",
  "2030-04-13",
  "2031-04-02",
  "2032-03-22",
  "2033-03-11",
  "2034-03-01",
  "2035-02-18",
  "2036-02-07",
  "2037-01-26",
  "2038-01-16",
  "2039-01-05",
  "2039-12-26",
  "2040-12-14",
] as const;

const WEEKDAY_TR = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
] as const;

const MONTH_TR = [
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

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}-${pad2(utc.getUTCDate())}`;
}

export function parseDateKeyParts(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day };
}

export function weekdayNameTr(dateKey: string): string {
  const { year, month, day } = parseDateKeyParts(dateKey);
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return WEEKDAY_TR[utcDay];
}

export function formatTurkeyHolidayDate(dateKey: string): string {
  const { year, month, day } = parseDateKeyParts(dateKey);
  return `${day} ${MONTH_TR[month - 1]} ${year} ${weekdayNameTr(dateKey)}`;
}

function addHoliday(
  map: Map<string, TurkeyPublicHoliday[]>,
  holiday: TurkeyPublicHoliday
) {
  const list = map.get(holiday.date) ?? [];
  if (list.some((item) => item.name === holiday.name)) return;
  list.push(holiday);
  map.set(holiday.date, list);
}

function buildHolidayIndex(): Map<string, TurkeyPublicHoliday[]> {
  const map = new Map<string, TurkeyPublicHoliday[]>();

  for (
    let year = TURKEY_HOLIDAY_YEAR_START;
    year <= TURKEY_HOLIDAY_YEAR_END;
    year += 1
  ) {
    addHoliday(map, {
      date: `${year}-01-01`,
      name: "Yılbaşı",
      shortName: "Yılbaşı",
      kind: "NEW_YEAR",
    });
    addHoliday(map, {
      date: `${year}-04-23`,
      name: "Ulusal Egemenlik ve Çocuk Bayramı",
      shortName: "23 Nisan",
      kind: "NATIONAL_SOVEREIGNTY",
    });
    addHoliday(map, {
      date: `${year}-05-01`,
      name: "Emek ve Dayanışma Günü",
      shortName: "1 Mayıs",
      kind: "LABOR_DAY",
    });
    addHoliday(map, {
      date: `${year}-05-19`,
      name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı",
      shortName: "19 Mayıs",
      kind: "YOUTH_SPORTS",
    });
    addHoliday(map, {
      date: `${year}-07-15`,
      name: "Demokrasi ve Millî Birlik Günü",
      shortName: "15 Temmuz",
      kind: "DEMOCRACY",
    });
    addHoliday(map, {
      date: `${year}-08-30`,
      name: "Zafer Bayramı",
      shortName: "Zafer Bayramı",
      kind: "VICTORY",
    });
    addHoliday(map, {
      date: `${year}-10-28`,
      name: "Cumhuriyet Bayramı Arifesi",
      shortName: "28 Ekim",
      kind: "REPUBLIC_EVE",
      halfDay: true,
    });
    addHoliday(map, {
      date: `${year}-10-29`,
      name: "Cumhuriyet Bayramı",
      shortName: "29 Ekim",
      kind: "REPUBLIC",
    });
  }

  for (const first of RAMADAN_FIRST_DAYS) {
    addHoliday(map, {
      date: shiftDateKey(first, -1),
      name: "Ramazan Bayramı Arifesi",
      shortName: "Ramazan Arife",
      kind: "RAMADAN_EVE",
      halfDay: true,
    });
    for (let dayIndex = 1; dayIndex <= 3; dayIndex += 1) {
      addHoliday(map, {
        date: shiftDateKey(first, dayIndex - 1),
        name: `Ramazan Bayramı ${dayIndex}. Gün`,
        shortName: `Ramazan ${dayIndex}. Gün`,
        kind: "RAMADAN",
        dayIndex,
      });
    }
  }

  for (const first of SACRIFICE_FIRST_DAYS) {
    addHoliday(map, {
      date: shiftDateKey(first, -1),
      name: "Kurban Bayramı Arifesi",
      shortName: "Kurban Arife",
      kind: "SACRIFICE_EVE",
      halfDay: true,
    });
    for (let dayIndex = 1; dayIndex <= 4; dayIndex += 1) {
      addHoliday(map, {
        date: shiftDateKey(first, dayIndex - 1),
        name: `Kurban Bayramı ${dayIndex}. Gün`,
        shortName: `Kurban ${dayIndex}. Gün`,
        kind: "SACRIFICE",
        dayIndex,
      });
    }
  }

  return map;
}

let holidayIndex: Map<string, TurkeyPublicHoliday[]> | null = null;

function getHolidayIndex() {
  if (!holidayIndex) holidayIndex = buildHolidayIndex();
  return holidayIndex;
}

export function getTurkeyPublicHolidaysOnDate(
  dateKey: string
): TurkeyPublicHoliday[] {
  return getHolidayIndex().get(dateKey) ?? [];
}

export function getTurkeyPublicHolidayTooltip(dateKey: string): string | null {
  const holidays = getTurkeyPublicHolidaysOnDate(dateKey);
  if (holidays.length === 0) return null;
  return holidays
    .map((holiday) =>
      holiday.halfDay ? `${holiday.name} (yarım gün)` : holiday.name
    )
    .join(" / ");
}

export function isTurkeyPublicHoliday(dateKey: string): boolean {
  return getTurkeyPublicHolidaysOnDate(dateKey).length > 0;
}

export function getTurkeyPublicHolidaysForYear(
  year: number
): TurkeyPublicHoliday[] {
  const prefix = `${year}-`;
  const holidays: TurkeyPublicHoliday[] = [];
  for (const [date, items] of getHolidayIndex()) {
    if (date.startsWith(prefix)) holidays.push(...items);
  }
  holidays.sort((a, b) => a.date.localeCompare(b.date));
  return holidays;
}

export function getTurkeyPublicHolidayDatesForYear(year: number): string[] {
  const seen = new Set<string>();
  for (const holiday of getTurkeyPublicHolidaysForYear(year)) {
    seen.add(holiday.date);
  }
  return [...seen].sort();
}

export const TURKEY_HOLIDAY_TYPE_PAGES = [
  {
    kind: "NEW_YEAR" as const,
    slug: "yilbasi-resmi-tatil-gunleri",
    title: "Yılbaşı Resmi Tatil Günleri (1 Ocak)",
    shortTitle: "Yılbaşı",
  },
  {
    kind: "NATIONAL_SOVEREIGNTY" as const,
    slug: "23-nisan-ulusal-egemenlik-ve-cocuk-bayrami",
    title: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı",
    shortTitle: "23 Nisan",
  },
  {
    kind: "LABOR_DAY" as const,
    slug: "1-mayis-emek-ve-dayanisma-gunu",
    title: "1 Mayıs Emek ve Dayanışma Günü",
    shortTitle: "1 Mayıs",
  },
  {
    kind: "YOUTH_SPORTS" as const,
    slug: "19-mayis-ataturk-anma-genclik-ve-spor-bayrami",
    title: "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı",
    shortTitle: "19 Mayıs",
  },
  {
    kind: "DEMOCRACY" as const,
    slug: "15-temmuz-demokrasi-ve-milli-birlik-gunu",
    title: "15 Temmuz Demokrasi ve Millî Birlik Günü",
    shortTitle: "15 Temmuz",
  },
  {
    kind: "VICTORY" as const,
    slug: "30-agustos-zafer-bayrami",
    title: "30 Ağustos Zafer Bayramı",
    shortTitle: "Zafer Bayramı",
  },
  {
    kind: "REPUBLIC" as const,
    slug: "29-ekim-cumhuriyet-bayrami",
    title: "29 Ekim Cumhuriyet Bayramı",
    shortTitle: "Cumhuriyet Bayramı",
  },
  {
    kind: "RAMADAN" as const,
    slug: "ramazan-bayrami-resmi-tatil-tarihleri",
    title: "Ramazan Bayramı Resmi Tatil Tarihleri",
    shortTitle: "Ramazan Bayramı",
  },
  {
    kind: "SACRIFICE" as const,
    slug: "kurban-bayrami-resmi-tatil-tarihleri",
    title: "Kurban Bayramı Resmi Tatil Tarihleri",
    shortTitle: "Kurban Bayramı",
  },
] as const;

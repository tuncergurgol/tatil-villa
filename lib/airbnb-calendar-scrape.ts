import { toDateKey } from "@/lib/villa-period-calendar";
import { offsetDateKey } from "@/lib/villa-period-selection";

const AIRBNB_API_KEY = "d306zoyjsyarp7ifhu67rjxn52tv0t20";
const FETCH_TIMEOUT_MS = 30_000;

/** Airbnb web istemci anahtarı; kamuya açık bootstrap verisinden. */
export const DEFAULT_AIRBNB_AVAILABILITY_QUERY_HASH =
  "b23335819df0dc391a338d665e2ee2f5d3bff19181d05c0b39bc6c5aac403914";

export type AirbnbCalendarDay = {
  calendarDate: string;
  available: boolean;
  availableForCheckin: boolean;
  availableForCheckout: boolean;
  minNights: number | null;
  maxNights: number | null;
};

export type AirbnbCalendarStay = {
  startDateKey: string;
  endDateKey: string;
};

export function isAirbnbRoomUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("airbnb.")) return false;
    return /\/rooms\/\d+/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function extractAirbnbListingId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const match = parsed.pathname.match(/\/rooms\/(\d+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function airbnbOriginFromUrl(url: string): string {
  const parsed = new URL(url.trim());
  return `${parsed.protocol}//${parsed.hostname}`;
}

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function discoverAirbnbAvailabilityQueryHash(
  roomUrl: string
): Promise<string | null> {
  const html = await fetchText(roomUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    },
  });

  const scriptUrls = [
    ...new Set(
      [
        ...html.matchAll(
          /https:\/\/a0\.muscache\.com\/airbnb\/static\/packages\/web\/[^"']+\.js/g
        ),
      ].map((match) => match[0])
    ),
  ];

  for (const scriptUrl of scriptUrls) {
    const js = await fetchText(scriptUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!/PdpAvailabilityCalendar/i.test(js)) continue;

    const after = js.match(
      /PdpAvailabilityCalendar[\s\S]{0,500}?([a-f0-9]{64})/i
    );
    if (after?.[1]) return after[1];

    const before = js.match(
      /([a-f0-9]{64})[\s\S]{0,300}?PdpAvailabilityCalendar/i
    );
    if (before?.[1]) return before[1];
  }

  return null;
}

type AvailabilityResponse = {
  data?: {
    merlin?: {
      pdpAvailabilityCalendar?: {
        calendarMonths?: Array<{
          month?: number;
          year?: number;
          days?: Array<{
            calendarDate?: string;
            available?: boolean;
            availableForCheckin?: boolean;
            availableForCheckout?: boolean;
            minNights?: number | null;
            maxNights?: number | null;
          }>;
        }>;
      };
    };
  };
};

async function fetchAirbnbCalendarChunk(input: {
  roomUrl: string;
  listingId: string;
  month: number;
  year: number;
  count: number;
  queryHash: string;
}): Promise<AirbnbCalendarDay[]> {
  const origin = airbnbOriginFromUrl(input.roomUrl);
  const variables = {
    request: {
      count: input.count,
      listingId: input.listingId,
      month: input.month,
      year: input.year,
      returnPropertyLevelCalendarIfApplicable: false,
    },
  };
  const extensions = {
    persistedQuery: {
      version: 1,
      sha256Hash: input.queryHash,
    },
  };

  const apiUrl = `${origin}/api/v3/PdpAvailabilityCalendar/${input.queryHash}?operationName=PdpAvailabilityCalendar&locale=tr&currency=TRY&variables=${encodeURIComponent(
    JSON.stringify(variables)
  )}&extensions=${encodeURIComponent(JSON.stringify(extensions))}`;

  const responseText = await fetchText(apiUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
      "x-airbnb-api-key": AIRBNB_API_KEY,
    },
  });

  let parsed: AvailabilityResponse;
  try {
    parsed = JSON.parse(responseText) as AvailabilityResponse;
  } catch {
    throw new Error("Airbnb takvim yanıtı JSON değil");
  }

  if (/PersistedQueryNotFound/i.test(responseText)) {
    throw new Error("AIRBNB_PERSISTED_QUERY_NOT_FOUND");
  }

  const months =
    parsed.data?.merlin?.pdpAvailabilityCalendar?.calendarMonths ?? [];
  const days: AirbnbCalendarDay[] = [];

  for (const month of months) {
    for (const day of month.days ?? []) {
      const calendarDate = String(day.calendarDate ?? "").trim();
      if (!calendarDate) continue;
      days.push({
        calendarDate,
        available: Boolean(day.available),
        availableForCheckin: Boolean(day.availableForCheckin),
        availableForCheckout: Boolean(day.availableForCheckout),
        minNights:
          typeof day.minNights === "number" ? day.minNights : null,
        maxNights:
          typeof day.maxNights === "number" ? day.maxNights : null,
      });
    }
  }

  if (days.length === 0) {
    throw new Error("Airbnb takvim günleri okunamadı");
  }

  return days;
}

export function mergeUnavailableAirbnbDaysToStays(
  days: AirbnbCalendarDay[]
): AirbnbCalendarStay[] {
  const blocked = [...days]
    .filter((day) => !day.available)
    .map((day) => day.calendarDate)
    .sort();

  if (blocked.length === 0) return [];

  const stays: AirbnbCalendarStay[] = [];
  let runStart = blocked[0]!;
  let runEnd = blocked[0]!;

  for (let index = 1; index < blocked.length; index++) {
    const dateKey = blocked[index]!;
    const expectedNext = offsetDateKey(runEnd, 1);
    if (dateKey === expectedNext) {
      runEnd = dateKey;
      continue;
    }
    stays.push({
      startDateKey: runStart,
      endDateKey: offsetDateKey(runEnd, 1),
    });
    runStart = dateKey;
    runEnd = dateKey;
  }

  stays.push({
    startDateKey: runStart,
    endDateKey: offsetDateKey(runEnd, 1),
  });

  return stays;
}

export async function fetchAirbnbCalendarStays(
  roomUrl: string,
  options?: {
    monthsAhead?: number;
    queryHash?: string;
  }
): Promise<{
  listingId: string;
  days: AirbnbCalendarDay[];
  stays: AirbnbCalendarStay[];
  queryHash: string;
}> {
  const listingId = extractAirbnbListingId(roomUrl);
  if (!listingId) {
    throw new Error("Airbnb ilan numarası URL'den okunamadı");
  }

  const monthsAhead = options?.monthsAhead ?? 24;
  let queryHash =
    options?.queryHash?.trim() || DEFAULT_AIRBNB_AVAILABILITY_QUERY_HASH;

  const today = new Date();
  const startMonth = today.getMonth() + 1;
  const startYear = today.getFullYear();

  const allDays = new Map<string, AirbnbCalendarDay>();
  let cursorMonth = startMonth;
  let cursorYear = startYear;
  let remaining = monthsAhead;

  while (remaining > 0) {
    const count = Math.min(12, remaining);
    let chunk: AirbnbCalendarDay[];

    try {
      chunk = await fetchAirbnbCalendarChunk({
        roomUrl,
        listingId,
        month: cursorMonth,
        year: cursorYear,
        count,
        queryHash,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "AIRBNB_PERSISTED_QUERY_NOT_FOUND"
      ) {
        const discovered = await discoverAirbnbAvailabilityQueryHash(roomUrl);
        if (!discovered) {
          throw new Error(
            "Airbnb takvim API hash'i bulunamadı (PersistedQueryNotFound)"
          );
        }
        queryHash = discovered;
        chunk = await fetchAirbnbCalendarChunk({
          roomUrl,
          listingId,
          month: cursorMonth,
          year: cursorYear,
          count,
          queryHash,
        });
      } else {
        throw error;
      }
    }

    for (const day of chunk) {
      allDays.set(day.calendarDate, day);
    }

    remaining -= count;
    cursorMonth += count;
    while (cursorMonth > 12) {
      cursorMonth -= 12;
      cursorYear += 1;
    }
  }

  const days = [...allDays.values()].sort((a, b) =>
    a.calendarDate.localeCompare(b.calendarDate)
  );
  const stays = mergeUnavailableAirbnbDaysToStays(days);

  return { listingId, days, stays, queryHash };
}

export function summarizeAirbnbCalendar(days: AirbnbCalendarDay[]) {
  const todayKey = toDateKey(new Date());
  const futureDays = days.filter((day) => day.calendarDate >= todayKey);
  const blockedDays = futureDays.filter((day) => !day.available).length;
  const stays = mergeUnavailableAirbnbDaysToStays(futureDays);
  return {
    dayCount: futureDays.length,
    blockedDays,
    stayCount: stays.length,
  };
}

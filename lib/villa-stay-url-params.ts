import { toDateKey } from "@/lib/villa-period-calendar";
import { formatStayDateTr } from "@/lib/villa-reservation-share";

const TR_DATE_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Üye girişinden sonra rezervasyon talebi modalını yeniden açmak için. */
export const VILLA_STAY_RESUME_REQUEST_PARAM = "talep";

function firstParam(
  value: string | string[] | undefined | null
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function parseGuestCountParam(
  raw: string | string[] | undefined | null,
  fallback = 0,
  max = 50
): number {
  const value = firstParam(raw);
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, max);
}

/** DD.MM.YYYY veya YYYY-MM-DD → YYYY-MM-DD; geçersizse null. */
export function parseStayDateParam(
  raw: string | string[] | undefined | null
): string | null {
  const value = firstParam(raw)?.trim();
  if (!value) return null;

  const tr = value.match(TR_DATE_RE);
  if (tr) {
    const day = Number(tr[1]);
    const month = Number(tr[2]);
    const year = Number(tr[3]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return toDateKey(date);
  }

  const iso = value.match(ISO_DATE_RE);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return toDateKey(date);
  }

  return null;
}

export type VillaStayUrlParams = {
  checkIn?: string | string[];
  checkOut?: string | string[];
  giristarihi?: string | string[];
  cikistarihi?: string | string[];
  adults?: string | string[];
  kisi?: string | string[];
  children?: string | string[];
  cocuk?: string | string[];
  babies?: string | string[];
  bebek?: string | string[];
  pets?: string | string[];
  evcil?: string | string[];
  talep?: string | string[];
};

/**
 * Villa detay URL parametrelerinden başlangıç konaklama aralığını çözer.
 * Öncelik: giristarihi/cikistarihi, yoksa checkIn/checkOut.
 */
export function resolveVillaStayDatesFromSearchParams(
  params: VillaStayUrlParams
): { checkIn: string; checkOut: string } | null {
  const checkIn =
    parseStayDateParam(params.giristarihi) ??
    parseStayDateParam(params.checkIn);
  const checkOut =
    parseStayDateParam(params.cikistarihi) ??
    parseStayDateParam(params.checkOut);

  if (!checkIn || !checkOut || checkIn >= checkOut) return null;
  return { checkIn, checkOut };
}

/** Varsayılan 2 yetişkin; URL'de kisi/adults varsa onu kullan. */
export function resolveVillaStayAdultsFromSearchParams(
  params: VillaStayUrlParams,
  fallback = 2
): number {
  const raw = firstParam(params.kisi) ?? firstParam(params.adults);
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 50);
}

export function resolveVillaStayGuestCountsFromSearchParams(
  params: VillaStayUrlParams,
  fallbackAdults = 2
): {
  adults: number;
  children: number;
  babies: number;
  pets: number;
} {
  return {
    adults: resolveVillaStayAdultsFromSearchParams(params, fallbackAdults),
    children: parseGuestCountParam(
      firstParam(params.cocuk) ?? firstParam(params.children)
    ),
    babies: parseGuestCountParam(
      firstParam(params.bebek) ?? firstParam(params.babies)
    ),
    pets: parseGuestCountParam(
      firstParam(params.evcil) ?? firstParam(params.pets)
    ),
  };
}

export function shouldResumeVillaStayRequest(
  params: Pick<VillaStayUrlParams, "talep"> | URLSearchParams
): boolean {
  const raw =
    params instanceof URLSearchParams
      ? params.get(VILLA_STAY_RESUME_REQUEST_PARAM)
      : firstParam(params.talep);
  return raw === "1" || raw === "true";
}

/**
 * Üye girişine gitmeden önce villa detayına dönüş URL'si.
 * Seçili tarih/misafir korunur; talep=1 ile modal yeniden açılır.
 */
export function buildVillaStayBookingReturnPath(input: {
  pathname: string;
  search?: string;
  checkIn: string;
  checkOut: string;
  guests: {
    adults: number;
    children: number;
    babies: number;
    pets: number;
  };
  openRequest?: boolean;
}): string {
  const params = new URLSearchParams(
    input.search?.startsWith("?")
      ? input.search.slice(1)
      : (input.search ?? "")
  );

  params.set("giristarihi", formatStayDateTr(input.checkIn));
  params.set("cikistarihi", formatStayDateTr(input.checkOut));
  params.set("kisi", String(Math.max(1, input.guests.adults)));

  if (input.guests.children > 0) {
    params.set("cocuk", String(input.guests.children));
  } else {
    params.delete("cocuk");
    params.delete("children");
  }
  if (input.guests.babies > 0) {
    params.set("bebek", String(input.guests.babies));
  } else {
    params.delete("bebek");
    params.delete("babies");
  }
  if (input.guests.pets > 0) {
    params.set("evcil", String(input.guests.pets));
  } else {
    params.delete("evcil");
    params.delete("pets");
  }

  if (input.openRequest) {
    params.set(VILLA_STAY_RESUME_REQUEST_PARAM, "1");
  } else {
    params.delete(VILLA_STAY_RESUME_REQUEST_PARAM);
  }

  const query = params.toString();
  return query ? `${input.pathname}?${query}` : input.pathname;
}

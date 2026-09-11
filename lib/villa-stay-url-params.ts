import { toDateKey } from "@/lib/villa-period-calendar";

const TR_DATE_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function firstParam(
  value: string | string[] | undefined | null
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
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

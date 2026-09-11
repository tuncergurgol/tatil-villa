import mernisIlceCodes from "@/lib/data/mernis-ilce-codes.json";
import { normalizeSearchText } from "@/lib/search-text";

export type MernisIlceCode = {
  code: string;
  ilceAdi: string;
  ilKodu: number;
  ilAdi: string;
  label: string;
};

const MERNIS_ILCE_CODES = mernisIlceCodes as MernisIlceCode[];

const codeMap = new Map(
  MERNIS_ILCE_CODES.map((item) => [item.code, item] as const)
);

export function getMernisIlceCodes(): MernisIlceCode[] {
  return MERNIS_ILCE_CODES;
}

export function getMernisIlceByCode(code: string | null | undefined) {
  if (!code) return null;
  return codeMap.get(code.padStart(4, "0")) ?? null;
}

export function getMernisIlceLabel(code: string | null | undefined) {
  return getMernisIlceByCode(code)?.label ?? null;
}

export function normalizeMernisSearch(value: string) {
  return normalizeSearchText(value.replace(/\u00a0/g, " ").replace(/\s+/g, " "));
}

export function filterMernisIlceCodes(
  query: string,
  limit = 50
): MernisIlceCode[] {
  const normalized = normalizeMernisSearch(query);

  if (!normalized) {
    return MERNIS_ILCE_CODES.slice(0, limit);
  }

  const results: MernisIlceCode[] = [];

  for (const item of MERNIS_ILCE_CODES) {
    const haystack = normalizeMernisSearch(
      `${item.ilceAdi} ${item.ilAdi} ${item.code}`
    );

    if (haystack.includes(normalized)) {
      results.push(item);
      if (results.length >= limit) break;
    }
  }

  return results;
}

export type TurkeyProvince = {
  ilKodu: number;
  ilAdi: string;
};

let provinceCache: TurkeyProvince[] | null = null;

export function getTurkeyProvinces(): TurkeyProvince[] {
  if (provinceCache) return provinceCache;

  const map = new Map<number, string>();
  for (const item of MERNIS_ILCE_CODES) {
    map.set(item.ilKodu, item.ilAdi);
  }

  provinceCache = Array.from(map.entries())
    .map(([ilKodu, ilAdi]) => ({ ilKodu, ilAdi }))
    .sort((a, b) => a.ilAdi.localeCompare(b.ilAdi, "tr"));

  return provinceCache;
}

export function getDistrictsByProvince(ilKodu: number): MernisIlceCode[] {
  return MERNIS_ILCE_CODES.filter((item) => item.ilKodu === ilKodu).sort(
    (a, b) => a.ilceAdi.localeCompare(b.ilceAdi, "tr")
  );
}

export function getProvinceByMernisCode(code: string | null | undefined) {
  const item = getMernisIlceByCode(code);
  if (!item) return null;
  return { ilKodu: item.ilKodu, ilAdi: item.ilAdi };
}

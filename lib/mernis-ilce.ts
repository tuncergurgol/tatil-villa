import mernisIlceCodes from "@/lib/data/mernis-ilce-codes.json";

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
  return value
    .replace(/\u00a0/g, " ")
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim();
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

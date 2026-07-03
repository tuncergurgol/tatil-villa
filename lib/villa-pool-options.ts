export const poolTypeOptions = [
  "Özel Havuz",
  "Ortak Havuz",
  "Çocuk Havuzu",
  "Kapalı Havuz",
] as const;

export const poolPurificationOptions = [
  "Klor",
  "Tuz",
  "Ozon",
  "Doğal",
] as const;

export type PoolTypeOption = (typeof poolTypeOptions)[number];
export type PoolPurificationOption = (typeof poolPurificationOptions)[number];

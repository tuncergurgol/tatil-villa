/** Türkiye tatil bölgeleri için ilçe/mahalle → posta kodu eşlemesi (GSC PostalAddress). */
const POSTAL_BY_PLACE: Record<string, string> = {
  alanya: "07400",
  antalya: "07000",
  belek: "07500",
  bodrum: "48400",
  dalaman: "48770",
  dalyan: "48840",
  datca: "48900",
  datça: "48900",
  demre: "07570",
  didim: "09270",
  fethiye: "48300",
  finike: "07740",
  gocek: "48310",
  göcek: "48310",
  kas: "07580",
  kaş: "07580",
  kalkan: "07960",
  kemer: "07980",
  kusadasi: "09400",
  kuşadası: "09400",
  marmaris: "48700",
  mugla: "48000",
  muğla: "48000",
  oludeniz: "48340",
  ölüdeniz: "48340",
  patara: "07976",
  side: "07330",
  uzumlu: "48300",
  üzümlü: "48300",
};

function normalizePlaceKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function resolveRegionPostalCode(parts: {
  il?: string;
  ilce?: string;
  mahalle?: string;
}): string {
  const candidates = [parts.mahalle, parts.ilce, parts.il].filter(Boolean) as string[];

  for (const name of candidates) {
    const key = normalizePlaceKey(name);
    const code = POSTAL_BY_PLACE[key];
    if (code) return code;
  }

  const il = parts.il?.trim();
  if (il) {
    const ilKey = normalizePlaceKey(il);
    if (POSTAL_BY_PLACE[ilKey]) return POSTAL_BY_PLACE[ilKey];
  }

  return "48000";
}

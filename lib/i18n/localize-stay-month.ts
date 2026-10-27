const TR_MONTHS: Record<string, Record<string, string>> = {
  en: {
    Ocak: "January",
    Şubat: "February",
    Mart: "March",
    Nisan: "April",
    Mayıs: "May",
    Haziran: "June",
    Temmuz: "July",
    Ağustos: "August",
    Eylül: "September",
    Ekim: "October",
    Kasım: "November",
    Aralık: "December",
  },
};

export function localizeStayMonth(value: string, locale: string): string {
  if (!value || locale === "tr") return value;
  const map = TR_MONTHS[locale] ?? TR_MONTHS.en;
  if (!map) return value;
  let out = value;
  for (const [tr, localized] of Object.entries(map)) {
    out = out.replace(new RegExp(tr, "gi"), localized);
  }
  return out;
}

/** Yaygın arama ülkeleri — varsayılan TR (+90), isimler Türkçe */

export type PhoneCountry = {
  iso: string;
  name: string;
  dial: string;
  /** Ulusal numara için yaklaşık üst sınır (sadece girişi sınırlar) */
  maxLength: number;
};

const OTHER_PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "AF", name: "Afganistan", dial: "93", maxLength: 9 },
  { iso: "DE", name: "Almanya", dial: "49", maxLength: 12 },
  { iso: "US", name: "Amerika Birleşik Devletleri", dial: "1", maxLength: 10 },
  { iso: "AD", name: "Andorra", dial: "376", maxLength: 6 },
  { iso: "AO", name: "Angola", dial: "244", maxLength: 9 },
  { iso: "AR", name: "Arjantin", dial: "54", maxLength: 10 },
  { iso: "AL", name: "Arnavutluk", dial: "355", maxLength: 9 },
  { iso: "AU", name: "Avustralya", dial: "61", maxLength: 10 },
  { iso: "AT", name: "Avusturya", dial: "43", maxLength: 11 },
  { iso: "AZ", name: "Azerbaycan", dial: "994", maxLength: 10 },
  { iso: "BH", name: "Bahreyn", dial: "973", maxLength: 8 },
  { iso: "BD", name: "Bangladeş", dial: "880", maxLength: 10 },
  { iso: "BY", name: "Belarus", dial: "375", maxLength: 9 },
  { iso: "BE", name: "Belçika", dial: "32", maxLength: 10 },
  { iso: "AE", name: "Birleşik Arap Emirlikleri", dial: "971", maxLength: 10 },
  { iso: "GB", name: "Birleşik Krallık", dial: "44", maxLength: 11 },
  { iso: "BA", name: "Bosna-Hersek", dial: "387", maxLength: 8 },
  { iso: "BR", name: "Brezilya", dial: "55", maxLength: 11 },
  { iso: "BG", name: "Bulgaristan", dial: "359", maxLength: 10 },
  { iso: "DZ", name: "Cezayir", dial: "213", maxLength: 9 },
  { iso: "CZ", name: "Çekya", dial: "420", maxLength: 10 },
  { iso: "CN", name: "Çin", dial: "86", maxLength: 11 },
  { iso: "DK", name: "Danimarka", dial: "45", maxLength: 8 },
  { iso: "ID", name: "Endonezya", dial: "62", maxLength: 11 },
  { iso: "AM", name: "Ermenistan", dial: "374", maxLength: 8 },
  { iso: "EE", name: "Estonya", dial: "372", maxLength: 9 },
  { iso: "MA", name: "Fas", dial: "212", maxLength: 9 },
  { iso: "PH", name: "Filipinler", dial: "63", maxLength: 10 },
  { iso: "FI", name: "Finlandiya", dial: "358", maxLength: 11 },
  { iso: "FR", name: "Fransa", dial: "33", maxLength: 10 },
  { iso: "ZA", name: "Güney Afrika", dial: "27", maxLength: 9 },
  { iso: "KR", name: "Güney Kore", dial: "82", maxLength: 10 },
  { iso: "GE", name: "Gürcistan", dial: "995", maxLength: 10 },
  { iso: "HR", name: "Hırvatistan", dial: "385", maxLength: 10 },
  { iso: "IN", name: "Hindistan", dial: "91", maxLength: 10 },
  { iso: "NL", name: "Hollanda", dial: "31", maxLength: 10 },
  { iso: "IQ", name: "Irak", dial: "964", maxLength: 11 },
  { iso: "IR", name: "İran", dial: "98", maxLength: 11 },
  { iso: "IE", name: "İrlanda", dial: "353", maxLength: 10 },
  { iso: "ES", name: "İspanya", dial: "34", maxLength: 9 },
  { iso: "SE", name: "İsveç", dial: "46", maxLength: 10 },
  { iso: "CH", name: "İsviçre", dial: "41", maxLength: 10 },
  { iso: "IT", name: "İtalya", dial: "39", maxLength: 11 },
  { iso: "IS", name: "İzlanda", dial: "354", maxLength: 7 },
  { iso: "JP", name: "Japonya", dial: "81", maxLength: 10 },
  { iso: "CA", name: "Kanada", dial: "1", maxLength: 10 },
  { iso: "ME", name: "Karadağ", dial: "382", maxLength: 8 },
  { iso: "QA", name: "Katar", dial: "974", maxLength: 8 },
  { iso: "KZ", name: "Kazakistan", dial: "7", maxLength: 10 },
  { iso: "KE", name: "Kenya", dial: "254", maxLength: 9 },
  { iso: "CY", name: "Kıbrıs", dial: "357", maxLength: 9 },
  { iso: "KG", name: "Kırgızistan", dial: "996", maxLength: 9 },
  { iso: "CO", name: "Kolombiya", dial: "57", maxLength: 10 },
  { iso: "XK", name: "Kosova", dial: "383", maxLength: 8 },
  { iso: "KW", name: "Kuveyt", dial: "965", maxLength: 8 },
  { iso: "KP", name: "Kuzey Kore", dial: "850", maxLength: 10 },
  { iso: "MK", name: "Kuzey Makedonya", dial: "389", maxLength: 8 },
  { iso: "CU", name: "Küba", dial: "53", maxLength: 8 },
  { iso: "LV", name: "Letonya", dial: "371", maxLength: 8 },
  { iso: "LY", name: "Libya", dial: "218", maxLength: 10 },
  { iso: "LI", name: "Lihtenştayn", dial: "423", maxLength: 9 },
  { iso: "LT", name: "Litvanya", dial: "370", maxLength: 9 },
  { iso: "LB", name: "Lübnan", dial: "961", maxLength: 9 },
  { iso: "LU", name: "Lüksemburg", dial: "352", maxLength: 10 },
  { iso: "HU", name: "Macaristan", dial: "36", maxLength: 10 },
  { iso: "MG", name: "Madagaskar", dial: "261", maxLength: 9 },
  { iso: "MY", name: "Malezya", dial: "60", maxLength: 10 },
  { iso: "MT", name: "Malta", dial: "356", maxLength: 8 },
  { iso: "MX", name: "Meksika", dial: "52", maxLength: 10 },
  { iso: "EG", name: "Mısır", dial: "20", maxLength: 10 },
  { iso: "MD", name: "Moldova", dial: "373", maxLength: 8 },
  { iso: "MC", name: "Monako", dial: "377", maxLength: 8 },
  { iso: "MR", name: "Moritanya", dial: "222", maxLength: 8 },
  { iso: "MZ", name: "Mozambik", dial: "258", maxLength: 9 },
  { iso: "NO", name: "Norveç", dial: "47", maxLength: 8 },
  { iso: "UZ", name: "Özbekistan", dial: "998", maxLength: 9 },
  { iso: "PK", name: "Pakistan", dial: "92", maxLength: 10 },
  { iso: "PL", name: "Polonya", dial: "48", maxLength: 10 },
  { iso: "PT", name: "Portekiz", dial: "351", maxLength: 10 },
  { iso: "RO", name: "Romanya", dial: "40", maxLength: 10 },
  { iso: "RU", name: "Rusya", dial: "7", maxLength: 10 },
  { iso: "SN", name: "Senegal", dial: "221", maxLength: 9 },
  { iso: "RS", name: "Sırbistan", dial: "381", maxLength: 9 },
  { iso: "SG", name: "Singapur", dial: "65", maxLength: 8 },
  { iso: "SK", name: "Slovakya", dial: "421", maxLength: 10 },
  { iso: "SI", name: "Slovenya", dial: "386", maxLength: 9 },
  { iso: "SO", name: "Somali", dial: "252", maxLength: 9 },
  { iso: "SD", name: "Sudan", dial: "249", maxLength: 9 },
  { iso: "SY", name: "Suriye", dial: "963", maxLength: 10 },
  { iso: "SA", name: "Suudi Arabistan", dial: "966", maxLength: 10 },
  { iso: "TJ", name: "Tacikistan", dial: "992", maxLength: 9 },
  { iso: "TZ", name: "Tanzanya", dial: "255", maxLength: 9 },
  { iso: "TH", name: "Tayland", dial: "66", maxLength: 9 },
  { iso: "TN", name: "Tunus", dial: "216", maxLength: 8 },
  { iso: "TM", name: "Türkmenistan", dial: "993", maxLength: 8 },
  { iso: "UA", name: "Ukrayna", dial: "380", maxLength: 10 },
  { iso: "OM", name: "Umman", dial: "968", maxLength: 8 },
  { iso: "JO", name: "Ürdün", dial: "962", maxLength: 10 },
  { iso: "VE", name: "Venezuela", dial: "58", maxLength: 10 },
  { iso: "VN", name: "Vietnam", dial: "84", maxLength: 10 },
  { iso: "YE", name: "Yemen", dial: "967", maxLength: 9 },
  { iso: "GR", name: "Yunanistan", dial: "30", maxLength: 10 },
  { iso: "NZ", name: "Yeni Zelanda", dial: "64", maxLength: 10 },
  { iso: "IL", name: "İsrail", dial: "972", maxLength: 10 },
].sort((left, right) => left.name.localeCompare(right.name, "tr"));

const DEFAULT_PHONE_COUNTRY: PhoneCountry = {
  iso: "TR",
  name: "Türkiye",
  dial: "90",
  maxLength: 10,
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  DEFAULT_PHONE_COUNTRY,
  ...OTHER_PHONE_COUNTRIES,
];

const DEFAULT_ISO = "TR";

export function getDefaultPhoneCountry(): PhoneCountry {
  return (
    PHONE_COUNTRIES.find((country) => country.iso === DEFAULT_ISO) ??
    PHONE_COUNTRIES[0]!
  );
}

export function countryFlagEmoji(iso: string): string {
  const code = iso.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(
    ...[...code].map((char) => 127397 + char.charCodeAt(0))
  );
}

export function findPhoneCountryByIso(iso: string): PhoneCountry | undefined {
  return PHONE_COUNTRIES.find(
    (country) => country.iso.toUpperCase() === iso.toUpperCase()
  );
}

/** En uzun eşleşen dial code kazanır (994 > 90 > 9) */
export function findPhoneCountryByDial(dialDigits: string): PhoneCountry | undefined {
  const dial = dialDigits.replace(/\D/g, "");
  if (!dial) return undefined;
  const matches = PHONE_COUNTRIES.filter((country) =>
    dial.startsWith(country.dial)
  );
  if (matches.length === 0) return undefined;
  return matches.sort((a, b) => b.dial.length - a.dial.length)[0];
}

export function parseStoredPhone(value: string): {
  country: PhoneCountry;
  national: string;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { country: getDefaultPhoneCountry(), national: "" };
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return { country: getDefaultPhoneCountry(), national: "" };
  }

  // Yerel TR: 05xx / 5xx
  if (
    !trimmed.startsWith("+") &&
    ((digits.startsWith("0") && digits.length === 11) ||
      (digits.startsWith("5") && digits.length === 10))
  ) {
    const national = digits.startsWith("0") ? digits.slice(1) : digits;
    return {
      country: getDefaultPhoneCountry(),
      national: national.slice(0, 10),
    };
  }

  const country = findPhoneCountryByDial(digits) ?? getDefaultPhoneCountry();
  let national = digits.startsWith(country.dial)
    ? digits.slice(country.dial.length)
    : digits;

  // TR özel: baştaki 0 ulusal formatta sık görülür
  if (country.iso === "TR" && national.startsWith("0")) {
    national = national.slice(1);
  }

  return {
    country,
    national: national.slice(0, country.maxLength),
  };
}

export function buildE164Phone(country: PhoneCountry, nationalRaw: string): string {
  let national = nationalRaw.replace(/\D/g, "");
  if (country.iso === "TR" && national.startsWith("0")) {
    national = national.slice(1);
  }
  national = national.slice(0, country.maxLength);
  if (!national) return "";
  return `+${country.dial}${national}`;
}

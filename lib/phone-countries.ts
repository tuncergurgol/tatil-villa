/** Yaygın arama ülkeleri — varsayılan TR (+90) */

export type PhoneCountry = {
  iso: string;
  name: string;
  dial: string;
  /** Ulusal numara için yaklaşık üst sınır (sadece girişi sınırlar) */
  maxLength: number;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "TR", name: "Turkey", dial: "90", maxLength: 10 },
  { iso: "DE", name: "Germany", dial: "49", maxLength: 12 },
  { iso: "GB", name: "United Kingdom", dial: "44", maxLength: 11 },
  { iso: "US", name: "United States", dial: "1", maxLength: 10 },
  { iso: "NL", name: "Netherlands", dial: "31", maxLength: 10 },
  { iso: "FR", name: "France", dial: "33", maxLength: 10 },
  { iso: "RU", name: "Russia", dial: "7", maxLength: 10 },
  { iso: "AZ", name: "Azerbaijan", dial: "994", maxLength: 10 },
  { iso: "AT", name: "Austria", dial: "43", maxLength: 11 },
  { iso: "BE", name: "Belgium", dial: "32", maxLength: 10 },
  { iso: "BG", name: "Bulgaria", dial: "359", maxLength: 10 },
  { iso: "CH", name: "Switzerland", dial: "41", maxLength: 10 },
  { iso: "CY", name: "Cyprus", dial: "357", maxLength: 9 },
  { iso: "CZ", name: "Czechia", dial: "420", maxLength: 10 },
  { iso: "DK", name: "Denmark", dial: "45", maxLength: 8 },
  { iso: "EE", name: "Estonia", dial: "372", maxLength: 9 },
  { iso: "ES", name: "Spain", dial: "34", maxLength: 9 },
  { iso: "FI", name: "Finland", dial: "358", maxLength: 11 },
  { iso: "GE", name: "Georgia", dial: "995", maxLength: 10 },
  { iso: "GR", name: "Greece", dial: "30", maxLength: 10 },
  { iso: "HR", name: "Croatia", dial: "385", maxLength: 10 },
  { iso: "HU", name: "Hungary", dial: "36", maxLength: 10 },
  { iso: "IE", name: "Ireland", dial: "353", maxLength: 10 },
  { iso: "IL", name: "Israel", dial: "972", maxLength: 10 },
  { iso: "IQ", name: "Iraq", dial: "964", maxLength: 11 },
  { iso: "IR", name: "Iran", dial: "98", maxLength: 11 },
  { iso: "IT", name: "Italy", dial: "39", maxLength: 11 },
  { iso: "JO", name: "Jordan", dial: "962", maxLength: 10 },
  { iso: "KW", name: "Kuwait", dial: "965", maxLength: 8 },
  { iso: "KZ", name: "Kazakhstan", dial: "7", maxLength: 10 },
  { iso: "LB", name: "Lebanon", dial: "961", maxLength: 9 },
  { iso: "LT", name: "Lithuania", dial: "370", maxLength: 9 },
  { iso: "LU", name: "Luxembourg", dial: "352", maxLength: 10 },
  { iso: "LV", name: "Latvia", dial: "371", maxLength: 8 },
  { iso: "NO", name: "Norway", dial: "47", maxLength: 8 },
  { iso: "PL", name: "Poland", dial: "48", maxLength: 10 },
  { iso: "PT", name: "Portugal", dial: "351", maxLength: 10 },
  { iso: "QA", name: "Qatar", dial: "974", maxLength: 8 },
  { iso: "RO", name: "Romania", dial: "40", maxLength: 10 },
  { iso: "SA", name: "Saudi Arabia", dial: "966", maxLength: 10 },
  { iso: "SE", name: "Sweden", dial: "46", maxLength: 10 },
  { iso: "SI", name: "Slovenia", dial: "386", maxLength: 9 },
  { iso: "SK", name: "Slovakia", dial: "421", maxLength: 10 },
  { iso: "SY", name: "Syria", dial: "963", maxLength: 10 },
  { iso: "UA", name: "Ukraine", dial: "380", maxLength: 10 },
  { iso: "AE", name: "United Arab Emirates", dial: "971", maxLength: 10 },
  { iso: "CA", name: "Canada", dial: "1", maxLength: 10 },
  { iso: "AU", name: "Australia", dial: "61", maxLength: 10 },
];

const DEFAULT_ISO = "TR";

export function getDefaultPhoneCountry(): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.iso === DEFAULT_ISO) ?? PHONE_COUNTRIES[0]!;
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

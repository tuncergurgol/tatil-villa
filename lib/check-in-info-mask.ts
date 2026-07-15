/**
 * Giriş bilgilendirme sayfalarında PII görünürlüğü.
 * Eşik: giriş anından 30 saat önce — sonrası (veya giriş sonrası) tam açık.
 */

export const CHECK_IN_PII_REVEAL_HOURS = 30;
export const DEFAULT_CHECK_IN_TIME = "16:00";
export const DEFAULT_CHECK_IN_TIMEZONE = "Europe/Istanbul";

export type CheckInPiiVisibility = {
  /** true = alanlar tam görünür, iletişim butonları aktif */
  revealed: boolean;
  /** Giriş anı (UTC Instant) */
  checkInInstant: Date;
  /** Kaç ms sonra açılır (negatif = zaten açık) */
  msUntilReveal: number;
};

/** Ad / telefon / e-posta / TC: ilk 2 karakter + kalan `*`. */
export function maskPiiKeepFirstTwo(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  if (value.length <= 2) {
    return value[0]! + "*".repeat(Math.max(0, value.length - 1));
  }
  return value.slice(0, 2) + "*".repeat(value.length - 2);
}

/** Adres / fatura adresi: tamamen gizli. */
export function maskFullyHidden(
  raw: string | null | undefined,
  placeholder = "Gizli"
): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  return placeholder;
}

export function applyPiiMask(
  raw: string | null | undefined,
  revealed: boolean
): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  return revealed ? value : maskPiiKeepFirstTwo(value);
}

export function applyAddressMask(
  raw: string | null | undefined,
  revealed: boolean,
  placeholder = "Gizli"
): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  return revealed ? value : maskFullyHidden(value, placeholder);
}

function parseHhMm(time: string): { hours: number; minutes: number } {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return { hours: 16, minutes: 0 };
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return {
    hours: Number.isFinite(hours) ? hours : 16,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
}

/** `date` (@db.Date / UTC midnight) + yerel saat → o timezone’daki anın UTC karşılığı. */
export function resolveZonedDateTimeUtc(
  date: Date,
  time: string,
  timeZone: string = DEFAULT_CHECK_IN_TIMEZONE
): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const { hours, minutes } = parseHhMm(time || DEFAULT_CHECK_IN_TIME);

  // Europe/Istanbul 2016’dan beri sabit UTC+3; genel durum için Intl ile düzelt.
  if (timeZone === "Europe/Istanbul" || timeZone === "Asia/Istanbul") {
    return new Date(Date.UTC(year, month - 1, day, hours - 3, minutes, 0, 0));
  }

  let guess = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  for (let i = 0; i < 3; i++) {
    const offsetMs = getTimeZoneOffsetMs(new Date(guess), timeZone);
    const next = Date.UTC(year, month - 1, day, hours, minutes, 0, 0) - offsetMs;
    if (next === guess) break;
    guess = next;
  }
  return new Date(guess);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    dtf
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  ) as Record<string, string>;

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

export function resolveCheckInInstant(
  checkInDate: Date,
  checkInTime: string = DEFAULT_CHECK_IN_TIME,
  timeZone: string = DEFAULT_CHECK_IN_TIMEZONE
): Date {
  return resolveZonedDateTimeUtc(checkInDate, checkInTime, timeZone);
}

export function getCheckInPiiVisibility(input: {
  checkInDate: Date;
  checkInTime?: string | null;
  timeZone?: string | null;
  now?: Date;
  revealHours?: number;
}): CheckInPiiVisibility {
  const checkInInstant = resolveCheckInInstant(
    input.checkInDate,
    input.checkInTime?.trim() || DEFAULT_CHECK_IN_TIME,
    input.timeZone?.trim() || DEFAULT_CHECK_IN_TIMEZONE
  );
  const now = input.now ?? new Date();
  const revealHours = input.revealHours ?? CHECK_IN_PII_REVEAL_HOURS;
  const revealMs = revealHours * 60 * 60 * 1000;
  const revealAt = new Date(checkInInstant.getTime() - revealMs);
  const msUntilReveal = revealAt.getTime() - now.getTime();
  const revealed = now.getTime() >= revealAt.getTime();

  return {
    revealed,
    checkInInstant,
    msUntilReveal,
  };
}

export function isCheckInPiiRevealed(input: {
  checkInDate: Date;
  checkInTime?: string | null;
  timeZone?: string | null;
  now?: Date;
  revealHours?: number;
}): boolean {
  return getCheckInPiiVisibility(input).revealed;
}

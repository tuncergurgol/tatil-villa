import {
  normalizeWhatsappCalendarText,
  type WhatsappCalendarDateTrainingRule,
} from "@/lib/whatsapp-calendar-parser";
import { toDateKey } from "@/lib/villa-period-calendar";

export type ParsedDateTrainingLine = {
  samplePattern: string;
  startDateKey: string;
  endDateKey: string;
};

/** `1-8 ağaustos ==> 01.08.2026 - 08.08.2026` */
export function parseWhatsappCalendarDateTrainingLine(
  raw: string
): ParsedDateTrainingLine | { error: string } {
  const line = raw.trim();
  if (!line) {
    return { error: "Örnek satır boş olamaz." };
  }

  const match = line.match(
    /^(.+?)\s*=>\s*(\d{1,2}\.\d{1,2}\.\d{4})\s*-\s*(\d{1,2}\.\d{1,2}\.\d{4})\s*$/i
  );
  if (!match) {
    return {
      error:
        'Format: mesaj ==> GG.AA.YYYY - GG.AA.YYYY (ör. 1-8 ağaustos ==> 01.08.2026 - 08.08.2026)',
    };
  }

  const samplePattern = match[1]!.trim();
  const startDateKey = parseTurkishDotDate(match[2]!);
  const endDateKey = parseTurkishDotDate(match[3]!);

  if (!samplePattern) {
    return { error: "Mesaj örneği gerekli." };
  }
  if (!startDateKey || !endDateKey) {
    return { error: "Tarihler GG.AA.YYYY formatında olmalı." };
  }
  if (startDateKey > endDateKey) {
    return { error: "Başlangıç tarihi bitişten sonra olamaz." };
  }

  return { samplePattern, startDateKey, endDateKey };
}

function parseTurkishDotDate(value: string): string | null {
  const parts = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!parts) return null;
  const day = Number(parts[1]);
  const month = Number(parts[2]);
  const year = Number(parts[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return toDateKey(new Date(year, month - 1, day));
}

export function formatDateTrainingLine(rule: {
  samplePattern: string;
  startDateKey: string;
  endDateKey: string;
}): string {
  return `${rule.samplePattern} ==> ${formatDotDate(rule.startDateKey)} - ${formatDotDate(rule.endDateKey)}`;
}

function formatDotDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  return `${day}.${month}.${year}`;
}

/** Öğrenilmiş örnekler: en uzun eşleşen kalıp kazanır. */
export function matchDateTrainingRule(
  text: string,
  rules: WhatsappCalendarDateTrainingRule[] | undefined
): { startDateKey: string; endDateKey: string; matchedPattern: string } | null {
  if (!rules?.length) return null;

  const normalizedBody = normalizeWhatsappCalendarText(text);
  let best: {
    startDateKey: string;
    endDateKey: string;
    matchedPattern: string;
    length: number;
  } | null = null;

  for (const rule of rules) {
    if (rule.active === false) continue;
    const pattern = rule.samplePattern.trim();
    if (!pattern) continue;
    const normalizedPattern = normalizeWhatsappCalendarText(pattern);
    if (!normalizedPattern) continue;
    if (!normalizedBody.includes(normalizedPattern)) continue;
    if (!best || normalizedPattern.length > best.length) {
      best = {
        startDateKey: rule.startDateKey,
        endDateKey: rule.endDateKey,
        matchedPattern: pattern,
        length: normalizedPattern.length,
      };
    }
  }

  return best
    ? {
        startDateKey: best.startDateKey,
        endDateKey: best.endDateKey,
        matchedPattern: best.matchedPattern,
      }
    : null;
}

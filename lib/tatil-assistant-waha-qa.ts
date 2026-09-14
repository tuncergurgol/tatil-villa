import { createHash } from "crypto";
import type { WahaChatMessage } from "@/lib/waha-client";

export const WAHA_QA_TOPIC_TITLE = "WhatsApp Konuşmaları";

export type ExtractedWahaQaPair = {
  fingerprint: string;
  question: string;
  answer: string;
  timestamp: number;
  chatName: string;
};

type ChatTurn = {
  fromMe: boolean;
  text: string;
  timestamp: number;
};

const URL_ONLY_RE = /^(https?:\/\/\S+)(\s+https?:\/\/\S+)*$/i;
const QUESTION_HINT_RE =
  /\b(hangi|kaç|kac|nerede|neresi|adınız|adiniz|isminiz|telefon|tarih|kişi|kisi|bölge|bolge|öğrenebilir|ogrenebilir|istiyor|bakar mısın|bakar misin|uygun|müsait|musait)\b/i;

export function normalizeWahaQaText(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

export function wahaQaFingerprint(question: string, answer: string) {
  return createHash("sha256")
    .update(`${normalizeWahaQaText(question)}\n${normalizeWahaQaText(answer)}`)
    .digest("hex");
}

export function wahaAnswerLooksLikeQuestion(text: string) {
  return text.includes("?") || QUESTION_HINT_RE.test(text);
}

function messageTimestamp(message: WahaChatMessage) {
  const raw = Number(message.timestamp ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw > 1_000_000_000_000 ? Math.floor(raw / 1000) : raw;
}

function messageText(message: WahaChatMessage) {
  const caption =
    typeof message._data?.caption === "string" ? message._data.caption : "";
  const nestedBody =
    typeof message._data?.body === "string" ? message._data.body : "";
  return (message.body || message.text || caption || nestedBody || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsableText(text: string) {
  if (text.length < 2) return false;
  if (URL_ONLY_RE.test(text)) return false;
  return true;
}

function pickRicherText(current: string, incoming: string) {
  if (incoming.length > current.length) return incoming;
  return current;
}

function toChronological(messages: WahaChatMessage[]) {
  return [...messages].sort((left, right) => {
    return messageTimestamp(left) - messageTimestamp(right);
  });
}

function collapseTurns(messages: WahaChatMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];

  for (const message of toChronological(messages)) {
    const text = messageText(message);
    if (!isUsableText(text)) continue;
    const fromMe = message.fromMe === true;
    const timestamp = messageTimestamp(message);
    const previous = turns[turns.length - 1];
    if (previous && previous.fromMe === fromMe) {
      previous.text = `${previous.text}\n${text}`.trim();
      previous.timestamp = timestamp || previous.timestamp;
      continue;
    }
    turns.push({ fromMe, text, timestamp });
  }

  return turns;
}

export function extractWahaQaPairs(
  messages: WahaChatMessage[],
  chatName: string
): ExtractedWahaQaPair[] {
  const turns = collapseTurns(messages);
  const pairs: ExtractedWahaQaPair[] = [];

  for (let index = 0; index < turns.length - 1; index += 1) {
    const current = turns[index];
    const next = turns[index + 1];
    if (current.fromMe || !next.fromMe) continue;
    if (!isUsableText(current.text) || !isUsableText(next.text)) continue;
    if (normalizeWahaQaText(current.text) === normalizeWahaQaText(next.text)) {
      continue;
    }

    const question = current.text.slice(0, 4000);
    const answer = next.text.slice(0, 4000);
    pairs.push({
      fingerprint: wahaQaFingerprint(question, answer),
      question,
      answer,
      timestamp: next.timestamp || current.timestamp,
      chatName,
    });
  }

  return pairs;
}

export function mergeExtractedWahaQaPairs(pairs: ExtractedWahaQaPair[]) {
  const merged = new Map<
    string,
    ExtractedWahaQaPair & { occurrenceCount: number }
  >();

  for (const pair of pairs) {
    const existing = merged.get(pair.fingerprint);
    if (!existing) {
      merged.set(pair.fingerprint, { ...pair, occurrenceCount: 1 });
      continue;
    }
    existing.occurrenceCount += 1;
    existing.question = pickRicherText(existing.question, pair.question);
    existing.answer = pickRicherText(existing.answer, pair.answer);
    if (pair.timestamp >= existing.timestamp) {
      existing.timestamp = pair.timestamp;
      if (pair.chatName) existing.chatName = pair.chatName;
    }
  }

  return [...merged.values()];
}

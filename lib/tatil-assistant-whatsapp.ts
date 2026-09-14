import { getCompanySettings } from "@/lib/queries/company-settings";
import { getAssistantWahaConfig } from "@/lib/queries/tatil-assistant";
import {
  normalizePhoneNumberForWaha,
  sendWahaTextMessageToPhone,
} from "@/lib/waha-client";

export async function sendAssistantWhatsAppMessage(
  phone: string,
  text: string
) {
  const settings = await getCompanySettings();
  const config = getAssistantWahaConfig(settings);

  if (!config.baseUrl || !config.apiKey) {
    throw new Error("Tatil Asistanı WhatsApp yapılandırılmamış");
  }

  const normalized = normalizePhoneNumberForWaha(phone);
  if (!normalized) {
    throw new Error("Geçersiz telefon numarası");
  }

  await sendWahaTextMessageToPhone(
    config.baseUrl,
    config.apiKey,
    config.sessionName,
    normalized,
    text
  );
}

export function normalizeWahaAssistantPayload(payload: unknown): {
  chatId: string;
  phone: string;
  text: string;
  fromMe: boolean;
} | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as Record<string, unknown>;

  const event = typeof body.event === "string" ? body.event : "";
  if (event && event !== "message") return null;

  const payloadData = (body.payload ?? body) as Record<string, unknown>;
  if (payloadData.fromMe === true) return null;

  const chatId =
    (typeof payloadData.from === "string" && payloadData.from) ||
    (typeof payloadData.chatId === "string" && payloadData.chatId) ||
    "";

  if (!chatId || chatId.includes("@g.us")) return null;

  const text =
    (typeof payloadData.body === "string" && payloadData.body) ||
    (typeof payloadData.text === "string" && payloadData.text) ||
    "";

  if (!text.trim()) return null;

  const phone = chatId.replace(/@.*/, "").replace(/\D/g, "");
  if (!phone) return null;

  return {
    chatId,
    phone,
    text: text.trim(),
    fromMe: false,
  };
}

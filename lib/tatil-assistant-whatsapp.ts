import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  getAssistantWahaConfig,
  getNotificationWahaConfig,
} from "@/lib/queries/tatil-assistant";
import {
  getWahaConnectionState,
  normalizePhoneNumberForWaha,
  sendWahaTextMessageToPhone,
} from "@/lib/waha-client";

async function sessionCanSend(
  baseUrl: string,
  apiKey: string,
  sessionName: string
) {
  if (!baseUrl || !apiKey || !sessionName) return false;
  const state = await getWahaConnectionState(baseUrl, apiKey, sessionName);
  return state?.rawStatus === "WORKING";
}

export async function sendAssistantWhatsAppMessage(
  phone: string,
  text: string
) {
  const settings = await getCompanySettings();
  const assistant = getAssistantWahaConfig(settings);
  const notification = getNotificationWahaConfig(settings);

  const normalized = normalizePhoneNumberForWaha(phone);
  if (!normalized) {
    throw new Error("Geçersiz telefon numarası");
  }

  const assistantReady = await sessionCanSend(
    assistant.baseUrl,
    assistant.apiKey,
    assistant.sessionName
  );
  const config = assistantReady
    ? assistant
    : notification.sessionName
      ? notification
      : assistant;

  if (!config.baseUrl || !config.apiKey || !config.sessionName) {
    throw new Error("Tatil Asistanı WhatsApp yapılandırılmamış");
  }

  await sendWahaTextMessageToPhone(
    config.baseUrl,
    config.apiKey,
    config.sessionName,
    normalized,
    text
  );
}

export type WahaWebhookClassification =
  | { action: "customer"; chatId: string; phone: string; text: string }
  | { action: "ignore" }
  | { action: "pass" };

export function classifyWahaWebhook(payload: unknown): WahaWebhookClassification {
  if (!payload || typeof payload !== "object") return { action: "pass" };
  const body = payload as Record<string, unknown>;
  const event = typeof body.event === "string" ? body.event : "";

  if (event && event !== "message" && event !== "message.any") {
    return { action: "ignore" };
  }

  const payloadData = (
    body.payload ?? (event ? body : null)
  ) as Record<string, unknown> | null;
  if (!payloadData || typeof payloadData !== "object") return { action: "pass" };

  const chatId =
    (typeof payloadData.from === "string" && payloadData.from) ||
    (typeof payloadData.chatId === "string" && payloadData.chatId) ||
    "";

  if (!chatId) return { action: "pass" };
  if (chatId.includes("@g.us")) return { action: "pass" };
  if (payloadData.fromMe === true) return { action: "ignore" };

  const text =
    (typeof payloadData.body === "string" && payloadData.body) ||
    (typeof payloadData.text === "string" && payloadData.text) ||
    "";
  if (!text.trim()) return { action: "ignore" };

  const phone = chatId.replace(/@.*/, "").replace(/\D/g, "");
  if (!phone) return { action: "ignore" };

  return {
    action: "customer",
    chatId,
    phone,
    text: text.trim(),
  };
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

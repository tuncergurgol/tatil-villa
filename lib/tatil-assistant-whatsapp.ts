import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  getAssistantWahaConfig,
  getNotificationWahaConfig,
} from "@/lib/queries/tatil-assistant";
import {
  getWahaConnectionState,
  normalizePhoneNumberForWaha,
  sendWahaTextMessageToPhone,
  wahaRequest,
} from "@/lib/waha-client";

/** Geliştirme: YumYum yalnızca bu WhatsApp numarasına cevap verir. */
const ASSISTANT_DEV_WHATSAPP_ALLOWLIST = ["905466456072"];

export function isAssistantDevWhatsAppAllowed(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  if (last10.length < 10) return false;
  return ASSISTANT_DEV_WHATSAPP_ALLOWLIST.some((item) => item.endsWith(last10));
}

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
  if (!isAssistantDevWhatsAppAllowed(normalized)) {
    throw new Error("YumYum geliştirme aşamasında yalnızca deneme numarasına yazar");
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

function isCustomerMobile(digits: string) {
  return /^(?:90)?5\d{9}$/.test(digits);
}

export async function resolveAssistantInboundPhone(
  chatId: string,
  fallbackDigits: string
) {
  const digits = fallbackDigits.replace(/\D/g, "");
  if (isCustomerMobile(digits)) return digits;
  if (!chatId.includes("@lid")) return digits;

  const settings = await getCompanySettings();
  const configs = [
    getNotificationWahaConfig(settings),
    getAssistantWahaConfig(settings),
  ];
  const lid = chatId.replace(/@.*/, "");

  for (const config of configs) {
    if (!config.baseUrl || !config.apiKey || !config.sessionName) continue;
    try {
      const data = await wahaRequest<{ pn?: string }>(
        config.baseUrl,
        config.apiKey,
        `/api/${encodeURIComponent(config.sessionName)}/lids/${encodeURIComponent(lid)}`
      );
      const pn = (data.pn ?? "").replace(/@.*/, "").replace(/\D/g, "");
      if (isCustomerMobile(pn)) return pn;
    } catch {
      // bir sonraki oturum
    }
  }

  return digits;
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

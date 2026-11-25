import { prisma } from "@/lib/db";
import { normalizeTurkishPhoneDigits } from "@/lib/phone-utils";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getNotificationWahaConfig } from "@/lib/queries/tatil-assistant";
import {
  getWahaConnectionState,
  sendWahaTextMessage,
  serializeWahaChatId,
  wahaRequest,
  type WahaChatId,
  type WahaChatMessage,
} from "@/lib/waha-client";
import {
  CUSTOMER_WHATSAPP_LINE_LABEL,
  type CustomerWhatsappChat,
  type CustomerWhatsappChatPage,
  type CustomerWhatsappMessage,
} from "@/lib/customer-whatsapp-types";

const CUSTOMER_LINE_SUFFIX = "2526180108";
const PAGE_SIZE = 40;
const THREAD_LIMIT = 80;

type OverviewChat = {
  id?: WahaChatId;
  name?: string | null;
  lastMessage?: WahaChatMessage | null;
  timestamp?: number;
  unreadCount?: number;
  isGroup?: boolean;
  _chat?: {
    isGroup?: boolean;
    unreadCount?: number;
    timestamp?: number;
    name?: string | null;
  } | null;
};

function unixSeconds(value: unknown) {
  const raw = Number(value ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw > 1_000_000_000_000 ? Math.floor(raw / 1000) : Math.floor(raw);
}

function messageText(message: WahaChatMessage | null | undefined) {
  if (!message) return "";
  const caption =
    typeof message._data?.caption === "string" ? message._data.caption : "";
  const nestedBody =
    typeof message._data?.body === "string" ? message._data.body : "";
  return (message.body || message.text || caption || nestedBody || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function messageId(message: WahaChatMessage, index: number) {
  const id = message.id;
  if (typeof id === "string" && id.trim()) return id.trim();
  if (id && typeof id === "object" && "_serialized" in id) {
    const serialized = (id as { _serialized?: string })._serialized?.trim();
    if (serialized) return serialized;
  }
  return `${message.timestamp ?? "t"}:${index}:${(message.body ?? "").slice(0, 24)}`;
}

export function assertDirectCustomerChatId(chatId: string) {
  const id = chatId.trim();
  if (!id || id.length > 160) {
    throw new Error("Geçersiz sohbet");
  }
  if (/@(g\.us|broadcast)\b|status@/i.test(id)) {
    throw new Error("Grup ve durum sohbetleri bu sayfada yok");
  }
  if (!/^[\w.-]+@(c\.us|lid|s\.whatsapp\.net)$/.test(id)) {
    throw new Error("Geçersiz sohbet");
  }
  return id;
}

function isDirectChat(chat: OverviewChat, chatId: string) {
  if (!chatId) return false;
  if (chat.isGroup || chat._chat?.isGroup) return false;
  if (chatId.includes("@g.us") || chatId.includes("status@")) return false;
  if (chatId.includes("@broadcast")) return false;
  return true;
}

function phoneDigitsFromName(name: string) {
  const digits = name.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length >= 12) {
    return normalizeTurkishPhoneDigits(digits);
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return normalizeTurkishPhoneDigits(digits);
  }
  if (digits.length === 10 && digits.startsWith("5")) return digits;
  return "";
}

async function customerWahaConfig() {
  const settings = await getCompanySettings();
  const config = getNotificationWahaConfig(settings);
  if (!config.baseUrl || !config.apiKey || !config.sessionName) {
    throw new Error("Müşteri WhatsApp oturumu yapılandırılmamış");
  }

  const state = await getWahaConnectionState(
    config.baseUrl,
    config.apiKey,
    config.sessionName
  );
  const phoneDigits = (state?.phoneId ?? "").replace(/\D/g, "");
  if (!phoneDigits.endsWith(CUSTOMER_LINE_SUFFIX)) {
    throw new Error(
      `Bağlı oturum ${CUSTOMER_WHATSAPP_LINE_LABEL} müşteri hattı değil`
    );
  }
  if (state?.status !== "WORKING") {
    throw new Error("Müşteri WhatsApp hattı bağlı değil");
  }

  return { ...config, pushName: state.pushName };
}

function toChat(chat: OverviewChat): CustomerWhatsappChat | null {
  const id = serializeWahaChatId(chat.id);
  if (!isDirectChat(chat, id)) return null;

  const rawName = (chat.name || chat._chat?.name || "").trim();
  const phoneDigits = phoneDigitsFromName(rawName);
  const text = messageText(chat.lastMessage);
  const media = chat.lastMessage?.hasMedia === true;
  const preview = (text || (media ? "Medya" : "")).slice(0, 180);

  return {
    id,
    title: rawName || "İsimsiz sohbet",
    phoneDigits,
    preview,
    fromMe: chat.lastMessage?.fromMe === true,
    timestamp: unixSeconds(
      chat.timestamp || chat._chat?.timestamp || chat.lastMessage?.timestamp
    ),
    unreadCount: Number(chat.unreadCount ?? chat._chat?.unreadCount ?? 0) || 0,
    customerId: null,
    customerName: null,
  };
}

async function attachCustomers(chats: CustomerWhatsappChat[]) {
  const digits = [
    ...new Set(chats.map((chat) => chat.phoneDigits).filter((value) => value.length === 10)),
  ];
  if (!digits.length) return chats;

  const customers = await prisma.customer.findMany({
    where: {
      OR: digits.map((value) => ({ phone: { endsWith: value } })),
    },
    select: { id: true, fullName: true, phone: true },
    take: 200,
  });

  const byDigits = new Map<string, { id: string; fullName: string }>();
  for (const customer of customers) {
    const key = normalizeTurkishPhoneDigits(customer.phone);
    if (key.length === 10 && !byDigits.has(key)) {
      byDigits.set(key, { id: customer.id, fullName: customer.fullName });
    }
  }

  return chats.map((chat) => {
    const match = chat.phoneDigits ? byDigits.get(chat.phoneDigits) : undefined;
    if (!match) return chat;
    return {
      ...chat,
      customerId: match.id,
      customerName: match.fullName,
    };
  });
}

export async function countCustomerWhatsappUnread(): Promise<number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const config = await customerWahaConfig();
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: "0",
    });
    const data = await wahaRequest<OverviewChat[] | { chats?: OverviewChat[] }>(
      config.baseUrl,
      config.apiKey,
      `/api/${encodeURIComponent(config.sessionName)}/chats/overview?${params.toString()}`,
      { signal: controller.signal }
    );
    const raw = Array.isArray(data) ? data : data?.chats ?? [];
    return raw.reduce((sum, chat) => {
      const id = serializeWahaChatId(chat.id);
      if (!isDirectChat(chat, id)) return sum;
      const unread = Number(chat.unreadCount ?? chat._chat?.unreadCount ?? 0);
      if (!Number.isFinite(unread) || unread <= 0) return sum;
      return sum + unread;
    }, 0);
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

export async function listCustomerWhatsappChats(
  offset = 0
): Promise<CustomerWhatsappChatPage> {
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  try {
    const config = await customerWahaConfig();
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(safeOffset),
    });
    const data = await wahaRequest<OverviewChat[] | { chats?: OverviewChat[] }>(
      config.baseUrl,
      config.apiKey,
      `/api/${encodeURIComponent(config.sessionName)}/chats/overview?${params.toString()}`
    );
    const raw = Array.isArray(data) ? data : data?.chats ?? [];
    const chats = await attachCustomers(
      raw
        .map(toChat)
        .filter((chat): chat is CustomerWhatsappChat => Boolean(chat))
        .sort((left, right) => right.timestamp - left.timestamp)
    );

    return {
      chats,
      hasMore: raw.length === PAGE_SIZE,
      nextOffset: safeOffset + raw.length,
      lineLabel: CUSTOMER_WHATSAPP_LINE_LABEL,
      connectedName: config.pushName,
      error: null,
    };
  } catch (error) {
    return {
      chats: [],
      hasMore: false,
      nextOffset: safeOffset,
      lineLabel: CUSTOMER_WHATSAPP_LINE_LABEL,
      connectedName: null,
      error: error instanceof Error ? error.message : "Sohbetler alınamadı",
    };
  }
}

export async function listCustomerWhatsappMessages(
  chatId: string
): Promise<CustomerWhatsappMessage[]> {
  const id = assertDirectCustomerChatId(chatId);
  const config = await customerWahaConfig();
  const params = new URLSearchParams({
    limit: String(THREAD_LIMIT),
    downloadMedia: "false",
  });
  const data = await wahaRequest<WahaChatMessage[] | { messages?: WahaChatMessage[] }>(
    config.baseUrl,
    config.apiKey,
    `/api/${encodeURIComponent(config.sessionName)}/chats/${encodeURIComponent(id)}/messages?${params.toString()}`
  );
  const raw = Array.isArray(data) ? data : data?.messages ?? [];

  return raw
    .map((message, index): CustomerWhatsappMessage | null => {
      const text = messageText(message).slice(0, 4000);
      const media = message.hasMedia === true;
      if (!text && !media) return null;
      return {
        id: messageId(message, index),
        text: text || "Medya",
        fromMe: message.fromMe === true,
        timestamp: unixSeconds(message.timestamp),
        media,
      };
    })
    .filter((message): message is CustomerWhatsappMessage => Boolean(message))
    .sort((left, right) => left.timestamp - right.timestamp || left.id.localeCompare(right.id));
}

export async function sendCustomerWhatsappReply(chatId: string, text: string) {
  const id = assertDirectCustomerChatId(chatId);
  const body = text.replace(/\u00a0/g, " ").trim();
  if (!body) throw new Error("Mesaj boş olamaz");
  if (body.length > 4000) throw new Error("Mesaj 4000 karakterden uzun olamaz");

  const config = await customerWahaConfig();
  await sendWahaTextMessage(
    config.baseUrl,
    config.apiKey,
    config.sessionName,
    id,
    body
  );
}

"use server";

import { requireAdmin } from "@/lib/auth-helpers";
import { isBlacklistedContact } from "@/lib/customer-blacklist";
import {
  listCustomerWhatsappChats,
  listCustomerWhatsappMessages,
  sendCustomerWhatsappReply,
} from "@/lib/customer-whatsapp-inbox";
import { getCustomerInboxProfile } from "@/lib/customer-inbox-profile";
import type {
  CustomerWhatsappChatPage,
  CustomerWhatsappThread,
} from "@/lib/customer-whatsapp-types";

export async function loadCustomerWhatsappChats(
  offset = 0
): Promise<CustomerWhatsappChatPage> {
  await requireAdmin();
  return listCustomerWhatsappChats(offset);
}

export async function loadCustomerWhatsappThread(
  chatId: string
): Promise<CustomerWhatsappThread> {
  await requireAdmin();
  try {
    const messages = await listCustomerWhatsappMessages(chatId);
    return { chatId, messages, error: null };
  } catch (error) {
    return {
      chatId,
      messages: [],
      error: error instanceof Error ? error.message : "Yazışma alınamadı",
    };
  }
}

export async function loadCustomerInboxProfile(input: {
  customerId?: string | null;
  phoneDigits?: string | null;
  name?: string | null;
}) {
  await requireAdmin();
  return getCustomerInboxProfile(input);
}

export async function replyCustomerWhatsapp(
  chatId: string,
  text: string,
  phoneDigits: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  try {
    if (phoneDigits && (await isBlacklistedContact({ phone: phoneDigits }))) {
      return { error: "Bu numara kara listede. Mesaj gönderilmedi." };
    }
    await sendCustomerWhatsappReply(chatId, text);
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Mesaj gönderilemedi",
    };
  }
}

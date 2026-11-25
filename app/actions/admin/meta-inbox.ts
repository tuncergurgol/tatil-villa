"use server";

import { requireAdmin } from "@/lib/auth-helpers";
import {
  listMetaInboxChats,
  listMetaInboxMessages,
  replyMetaInbox,
  syncMetaInbox,
} from "@/lib/meta-inbox";

export async function listStoredMetaInbox() {
  await requireAdmin();
  return listMetaInboxChats();
}

export async function loadMetaInbox(full = false) {
  await requireAdmin();
  const synced = await syncMetaInbox(full);
  const listed = await listMetaInboxChats();
  return {
    chats: listed.chats,
    error: synced.error ?? listed.error,
  };
}

export async function loadMetaInboxThread(externalId: string) {
  await requireAdmin();
  return listMetaInboxMessages(externalId);
}

export async function replyMetaInboxMessage(externalId: string, text: string) {
  await requireAdmin();
  return replyMetaInbox(externalId, text);
}

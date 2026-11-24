import { prisma } from "@/lib/db";
import { upsertFacebookLeadFromGraph } from "@/lib/facebook-lead-webhook";
import { normalizeTurkishPhoneDigits } from "@/lib/phone-utils";
import type {
  CustomerWhatsappChat,
  CustomerWhatsappMessage,
} from "@/lib/customer-whatsapp-types";

const GRAPH = "https://graph.facebook.com/v22.0";
const PAGE_SIZE = 25;
const FULL_CONVERSATION_PAGES = 20;
const FULL_POST_PAGES = 20;

type GraphError = { error?: { message?: string } };
type GraphPage<T> = GraphError & {
  data?: T[];
  paging?: { next?: string; cursors?: { after?: string } };
};

type GraphParticipant = { id?: string; name?: string };
type GraphMessage = {
  id?: string;
  message?: string;
  created_time?: string;
  from?: GraphParticipant;
};
type GraphConversation = {
  id?: string;
  updated_time?: string;
  unread_count?: number;
  snippet?: string;
  participants?: { data?: GraphParticipant[] };
  messages?: { data?: GraphMessage[]; paging?: { next?: string } };
};
type GraphComment = GraphMessage;
type GraphPost = {
  id?: string;
  message?: string;
  permalink_url?: string;
  created_time?: string;
  comments?: { data?: GraphComment[]; paging?: { next?: string } };
};
type IgComment = {
  id?: string;
  text?: string;
  timestamp?: string;
  username?: string;
};
type IgMedia = {
  id?: string;
  caption?: string;
  permalink?: string;
  timestamp?: string;
  comments?: { data?: IgComment[]; paging?: { next?: string } };
};
type LeadRow = {
  id?: string;
  created_time?: string;
  field_data?: Array<{ name?: string; values?: string[] }>;
};
type LeadForm = {
  id?: string;
  name?: string;
  leads?: { data?: LeadRow[]; paging?: { next?: string } };
};

export type MetaInboxChannel =
  | "messenger"
  | "instagram"
  | "facebook-comments"
  | "instagram-comments"
  | "facebook-lead";

type StoredMessage = {
  externalId: string;
  text: string;
  fromPage: boolean;
  senderName: string;
  sentAt: Date;
};

function cleanGraphError(error: unknown) {
  const message = error instanceof Error ? error.message : "Meta yazışmaları alınamadı";
  return message.replace(/EAA[A-Za-z0-9]+/g, "[token]");
}

async function readGraph<T>(token: string, url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  const data = (await response.json()) as T & GraphError;
  if (!response.ok) {
    throw new Error(data.error?.message || `Graph HTTP ${response.status}`);
  }
  return data;
}

function graphUrl(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function eachGraphPage<T>(
  token: string,
  path: string,
  params: Record<string, string>,
  maxPages: number,
  onPage: (rows: T[]) => Promise<void>
) {
  let next: string | null = graphUrl(path, params);
  for (let page = 0; page < maxPages && next; page += 1) {
    const data: GraphPage<T> = await readGraph(token, next);
    const rows = data.data ?? [];
    if (rows.length === 0) break;
    await onPage(rows);
    next = data.paging?.next ?? null;
  }
}

function isPermissionError(error: unknown) {
  const message = cleanGraphError(error).toLowerCase();
  return message.includes("permission") || message.includes("(#200)") || message.includes("(#230)");
}

function isHeavyGraphError(error: unknown) {
  const message = cleanGraphError(error).toLowerCase();
  return (
    message.includes("reduce the amount of data") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("aborted")
  );
}

async function readNextPages<T>(token: string, next: string | undefined, maxPages: number) {
  const rows: T[] = [];
  let url = next || "";
  for (let page = 0; page < maxPages && url; page += 1) {
    const data: GraphPage<T> = await readGraph(token, url);
    const batch = data.data ?? [];
    if (batch.length === 0) break;
    rows.push(...batch);
    url = data.paging?.next ?? "";
  }
  return rows;
}

function safeText(value: string) {
  return value.replace(/\u0000/g, "").replace(/\\/g, "");
}

function messageText(value: string | undefined) {
  const text = value?.trim() ?? "";
  return text || "[medya]";
}

function parseTime(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

async function saveThread(input: {
  channel: MetaInboxChannel;
  externalId: string;
  title: string;
  participantId: string;
  replyExternalId: string;
  unreadCount: number;
  unreadMode?: "absolute" | "increment";
  permalink?: string;
  messages: StoredMessage[];
}) {
  const title = safeText(input.title);
  const participantId = safeText(input.participantId);
  const replyExternalId = safeText(input.replyExternalId);
  const permalink = safeText(input.permalink ?? "");
  const ordered = input.messages
    .map((message) => ({
      ...message,
      text: safeText(message.text),
      senderName: safeText(message.senderName),
    }))
    .sort((left, right) => left.sentAt.getTime() - right.sentAt.getTime());
  const latest = ordered[ordered.length - 1];
  const preview = (latest?.text || "").slice(0, 180);
  const lastMessageAt = latest?.sentAt ?? new Date();
  const genericTitle =
    title === "Messenger" || title === "Instagram" || title === "Facebook yorumu";
  let unreadUpdate: number | { increment: number } = input.unreadCount;
  if (input.unreadMode === "increment") {
    const ids = ordered.map((message) => message.externalId);
    const existing = ids.length
      ? await prisma.metaInboxMessage.findMany({
          where: { externalId: { in: ids } },
          select: { externalId: true },
        })
      : [];
    const known = new Set(existing.map((row) => row.externalId));
    unreadUpdate = {
      increment: ordered.filter((message) => !known.has(message.externalId)).length,
    };
  }
  try {
  const thread = await prisma.metaInboxThread.upsert({
    where: { externalId: input.externalId },
    create: {
      channel: input.channel,
      externalId: input.externalId,
      title,
      preview,
      participantId,
      replyExternalId,
      unreadCount: input.unreadCount,
      fromPage: latest?.fromPage ?? false,
      permalink,
      lastMessageAt,
    },
    update: {
      ...(genericTitle ? {} : { title }),
      preview,
      ...(participantId ? { participantId } : {}),
      ...(replyExternalId ? { replyExternalId } : {}),
      unreadCount: unreadUpdate,
      fromPage: latest?.fromPage ?? false,
      ...(permalink ? { permalink } : {}),
      lastMessageAt,
    },
  });

  for (const message of ordered) {
    await prisma.metaInboxMessage.upsert({
      where: { externalId: message.externalId },
      create: {
        threadId: thread.id,
        externalId: message.externalId,
        text: message.text,
        fromPage: message.fromPage,
        senderName: message.senderName,
        sentAt: message.sentAt,
      },
      update: {
        text: message.text,
        fromPage: message.fromPage,
        senderName: message.senderName,
        sentAt: message.sentAt,
      },
    });
  }
  } catch (error) {
    console.error("thread skip", input.externalId, cleanGraphError(error).slice(0, 160));
  }
}

function mapStoredMessages(
  pageId: string,
  rows: GraphMessage[] | undefined,
  fallback: Date,
  ownIds: string[] = []
): StoredMessage[] {
  const own = new Set([pageId, ...ownIds].filter(Boolean));
  const messages: StoredMessage[] = [];
  for (const row of rows ?? []) {
    if (!row.id) continue;
    messages.push({
      externalId: row.id,
      text: messageText(row.message),
      fromPage: Boolean(row.from?.id && own.has(row.from.id)),
      senderName: row.from?.name?.trim() || "",
      sentAt: parseTime(row.created_time, fallback),
    });
  }
  return messages;
}

async function syncMessenger(token: string, pageId: string, maxPages: number) {
  await eachGraphPage<GraphConversation>(
    token,
    `${pageId}/conversations`,
    {
      platform: "messenger",
      limit: String(PAGE_SIZE),
      fields:
        "updated_time,unread_count,snippet,participants,messages.limit(50){id,message,from,created_time}",
    },
    maxPages,
    async (rows) => {
      for (const row of rows) {
        const people = row.participants?.data ?? [];
        const customer = people.find((person) => person.id && person.id !== pageId);
        const psid = customer?.id;
        if (!psid) continue;
        const fallback = parseTime(row.updated_time, new Date());
        const extra = await readNextPages<GraphMessage>(
          token,
          row.messages?.paging?.next,
          maxPages > 1 ? 2 : 0
        );
        const messages = mapStoredMessages(
          pageId,
          [...(row.messages?.data ?? []), ...extra],
          fallback
        );
        if (messages.length === 0 && row.snippet) {
          messages.push({
            externalId: `snippet:${psid}:${fallback.getTime()}`,
            text: row.snippet,
            fromPage: false,
            senderName: customer?.name?.trim() || "",
            sentAt: fallback,
          });
        }
        await saveThread({
          channel: "messenger",
          externalId: `messenger:${psid}`,
          title: customer?.name?.trim() || "Messenger",
          participantId: psid,
          replyExternalId: psid,
          unreadCount: row.unread_count ?? 0,
          unreadMode: "absolute",
          messages,
        });
      }
    }
  );
}

async function syncComments(token: string, pageId: string, maxPages: number) {
  await eachGraphPage<GraphPost>(
    token,
    `${pageId}/posts`,
    {
      limit: String(PAGE_SIZE),
      fields:
        "message,permalink_url,created_time,comments.limit(50){id,message,from,created_time}",
    },
    maxPages,
    async (rows) => {
      for (const post of rows) {
        const extra = await readNextPages<GraphComment>(
          token,
          post.comments?.paging?.next,
          maxPages > 1 ? 3 : 0
        );
        const comments = [...(post.comments?.data ?? []), ...extra];
        if (!post.id || comments.length === 0) continue;
        const fallback = parseTime(post.created_time, new Date());
        const messages = mapStoredMessages(pageId, comments, fallback);
        const latestCustomer = [...messages].reverse().find((item) => !item.fromPage);
        const titleSource = post.message?.trim() || "Facebook gönderisi";
        await saveThread({
          channel: "facebook-comments",
          externalId: `post:${post.id}`,
          title: titleSource.slice(0, 120),
          participantId: "",
          replyExternalId: latestCustomer?.externalId || comments[0]?.id || "",
          unreadCount: 0,
          unreadMode: "absolute",
          permalink: post.permalink_url || "",
          messages,
        });
      }
    }
  );
}

export async function syncMetaInbox(full: boolean) {
  const settings = await prisma.companySettings.findUnique({
    where: { id: "default" },
    select: { facebookLeadPageId: true, facebookLeadPageAccessToken: true },
  });
  const token = settings?.facebookLeadPageAccessToken?.trim() ?? "";
  const pageId = settings?.facebookLeadPageId?.trim() || "180607808991759";
  if (!token) {
    return { error: "Sayfa tokeni yok" as string | null };
  }

  const conversationPages = full ? FULL_CONVERSATION_PAGES : 1;
  const postPages = full ? FULL_POST_PAGES : 1;
  const errors: string[] = [];
  for (const task of [
    () => syncMessenger(token, pageId, conversationPages),
    () => syncComments(token, pageId, postPages),
    () => syncInstagram(token, pageId, conversationPages),
    () => syncLeadForms(token, pageId, full ? 4 : 1),
  ]) {
    try {
      await task();
    } catch (error) {
      if (!isPermissionError(error)) errors.push(cleanGraphError(error));
    }
  }
  return { error: errors[0] ?? null };
}

async function listInstagramConversationIds(
  token: string,
  pageId: string,
  igId: string,
  maxPages: number
) {
  const ids: string[] = [];
  const folders = maxPages > 1 ? ["", "other", "page_done"] : [""];
  const owners = igId && maxPages > 1 ? [pageId, igId] : [pageId];
  for (const owner of owners) {
    for (const folder of folders) {
      const params: Record<string, string> = {
        platform: "instagram",
        limit: "1",
        fields: "id",
      };
      if (folder) params.folder = folder;
      try {
        const page = await readGraph<GraphPage<GraphConversation>>(
          token,
          graphUrl(`${owner}/conversations`, params)
        );
        const id = page.data?.[0]?.id;
        if (id && !ids.includes(id)) ids.push(id);
      } catch (error) {
        if (isPermissionError(error) && ids.length === 0 && owner === pageId && !folder) {
          throw error;
        }
      }
    }
  }
  return ids;
}

async function saveInstagramConversation(
  token: string,
  pageId: string,
  igId: string,
  conversationId: string,
  maxPages: number
) {
  const row = await readGraph<GraphConversation>(
    token,
    graphUrl(conversationId, {
      fields: "updated_time,unread_count,snippet,participants",
    })
  );
  const messagePage = await readGraph<GraphPage<GraphMessage>>(
    token,
    graphUrl(`${conversationId}/messages`, {
      limit: "20",
      fields: "id,message,from,created_time",
    })
  );
  const people = row.participants?.data ?? [];
  const customer = people.find(
    (person) => person.id && person.id !== pageId && person.id !== igId
  );
  const psid = customer?.id || conversationId;
  const fallback = parseTime(row.updated_time, new Date());
  const extra = await readNextPages<GraphMessage>(
    token,
    messagePage.paging?.next,
    maxPages > 1 ? 2 : 0
  );
  const messages = mapStoredMessages(
    pageId,
    [...(messagePage.data ?? []), ...extra],
    fallback,
    igId ? [igId] : []
  );
  if (messages.length === 0 && row.snippet) {
    messages.push({
      externalId: `snippet:ig:${psid}:${fallback.getTime()}`,
      text: row.snippet,
      fromPage: false,
      senderName: customer?.name?.trim() || "",
      sentAt: fallback,
    });
  }
  if (messages.length === 0) return;
  await saveThread({
    channel: "instagram",
    externalId: `instagram:${psid}`,
    title: customer?.name?.trim() || "Instagram",
    participantId: psid,
    replyExternalId: psid,
    unreadCount: row.unread_count ?? 0,
    unreadMode: "absolute",
    messages,
  });
}

async function syncInstagram(token: string, pageId: string, maxPages: number) {
  const page = await readGraph<{
    instagram_business_account?: { id?: string };
    connected_instagram_account?: { id?: string };
  }>(
    token,
    graphUrl(pageId, {
      fields: "instagram_business_account,connected_instagram_account",
    })
  );
  const igId =
    page.instagram_business_account?.id || page.connected_instagram_account?.id || "";
  const conversationIds = await listInstagramConversationIds(token, pageId, igId, maxPages);
  for (const conversationId of conversationIds) {
    try {
      await saveInstagramConversation(token, pageId, igId, conversationId, maxPages);
    } catch (error) {
      if (!isHeavyGraphError(error) && !isPermissionError(error)) throw error;
    }
  }

  if (!igId) return;
  const profile = await readGraph<{ username?: string }>(
    token,
    graphUrl(igId, { fields: "username" })
  );
  const igUsername = profile.username?.trim() || "";
  try {
  await eachGraphPage<IgMedia>(
    token,
    `${igId}/media`,
    {
      limit: "8",
      fields:
        "caption,permalink,timestamp,comments.limit(20){id,text,username,timestamp}",
    },
    maxPages,
    async (rows) => {
      for (const media of rows) {
        const extra = await readNextPages<IgComment>(
          token,
          media.comments?.paging?.next,
          maxPages > 1 ? 3 : 0
        );
        const comments = [...(media.comments?.data ?? []), ...extra];
        if (!media.id || comments.length === 0) continue;
        const fallback = parseTime(media.timestamp, new Date());
        const messages: StoredMessage[] = comments
          .filter((comment) => comment.id)
          .map((comment) => ({
            externalId: comment.id as string,
            text: messageText(comment.text),
            fromPage: Boolean(igUsername && comment.username?.trim() === igUsername),
            senderName: comment.username?.trim() || "",
            sentAt: parseTime(comment.timestamp, fallback),
          }));
        const latestCustomer = [...messages].reverse().find((item) => !item.fromPage);
        await saveThread({
          channel: "instagram-comments",
          externalId: `igmedia:${media.id}`,
          title: (media.caption?.trim() || "Instagram gönderisi").slice(0, 120),
          participantId: "",
          replyExternalId: latestCustomer?.externalId || comments[0]?.id || "",
          unreadCount: 0,
          unreadMode: "absolute",
          permalink: media.permalink || "",
          messages,
        });
      }
    }
  );
  } catch (error) {
    if (!isHeavyGraphError(error) && !isPermissionError(error)) throw error;
  }
}

async function syncLeadForms(token: string, pageId: string, maxPages: number) {
  await eachGraphPage<LeadForm>(
    token,
    `${pageId}/leadgen_forms`,
    {
      limit: String(PAGE_SIZE),
      fields: "name,leads.limit(50){id,created_time,field_data}",
    },
    maxPages,
    async (forms) => {
      for (const form of forms) {
        const extra = await readNextPages<LeadRow>(
          token,
          form.leads?.paging?.next,
          maxPages > 1 ? 3 : 0
        );
        const leads = [...(form.leads?.data ?? []), ...extra];
        for (const lead of leads) {
          if (!lead.id) continue;
          const saved = await upsertFacebookLeadFromGraph({
            externalLeadId: lead.id,
            graph: {
              id: lead.id,
              created_time: lead.created_time,
              field_data: (lead.field_data ?? [])
                .filter((field) => field.name)
                .map((field) => ({
                  name: field.name as string,
                  values: field.values ?? [],
                })),
            },
            meta: { form_id: form.id, page_id: pageId },
          });
          if (form.name) {
            await prisma.facebookLead.update({
              where: { id: saved.id },
              data: { formName: form.name },
            });
          }
        }
      }
    }
  );
}

function toUnix(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

export async function listMetaInboxChats(): Promise<{
  chats: CustomerWhatsappChat[];
  error: string | null;
}> {
  const [threads, leads] = await Promise.all([
    prisma.metaInboxThread.findMany({
      orderBy: { lastMessageAt: "desc" },
      take: 500,
    }),
    prisma.facebookLead.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        formName: true,
        status: true,
        adminSeenAt: true,
        createdAt: true,
      },
    }),
  ]);

  const threadChats: CustomerWhatsappChat[] = threads.map((thread) => ({
    id: thread.externalId,
    channel: thread.channel as MetaInboxChannel,
    title: thread.title || "Misafir",
    phoneDigits: thread.phoneDigits,
    preview: thread.preview,
    fromMe: thread.fromPage,
    timestamp: toUnix(thread.lastMessageAt),
    unreadCount: thread.unreadCount,
    customerId: null,
    customerName: thread.title || null,
    permalink: thread.permalink,
  }));

  const leadChats: CustomerWhatsappChat[] = leads.map((lead) => {
    const phoneDigits = normalizeTurkishPhoneDigits(lead.phone);
    const title = lead.fullName.trim() || lead.phone || lead.email || "Facebook Lead";
    const preview = [lead.phone, lead.email, lead.formName].filter(Boolean).join(" · ");
    return {
      id: `lead:${lead.id}`,
      channel: "facebook-lead",
      title,
      phoneDigits: phoneDigits.length === 10 ? phoneDigits : "",
      preview: preview || lead.status,
      fromMe: false,
      timestamp: toUnix(lead.createdAt),
      unreadCount: lead.adminSeenAt ? 0 : 1,
      customerId: null,
      customerName: lead.fullName.trim() || null,
    };
  });

  return {
    chats: [...threadChats, ...leadChats].sort(
      (left, right) => right.timestamp - left.timestamp
    ),
    error: null,
  };
}

export async function listMetaInboxMessages(
  externalId: string
): Promise<{ messages: CustomerWhatsappMessage[]; error: string | null }> {
  if (externalId.startsWith("lead:")) {
    const leadId = externalId.slice("lead:".length);
    const lead = await prisma.facebookLead.findUnique({
      where: { id: leadId },
      include: { contactLogs: { orderBy: { createdAt: "asc" } } },
    });
    if (!lead) return { messages: [], error: "Lead bulunamadı" };
    await prisma.facebookLead.update({
      where: { id: lead.id },
      data: { adminSeenAt: lead.adminSeenAt ?? new Date() },
    });
    const fields = [
      lead.fullName && `Ad: ${lead.fullName}`,
      lead.phone && `Telefon: ${lead.phone}`,
      lead.email && `E-posta: ${lead.email}`,
      lead.formName && `Form: ${lead.formName}`,
      lead.campaignName && `Kampanya: ${lead.campaignName}`,
      lead.adName && `Reklam: ${lead.adName}`,
      lead.adminNote && `Not: ${lead.adminNote}`,
    ].filter(Boolean);
    const messages: CustomerWhatsappMessage[] = [
      {
        id: lead.id,
        text: fields.join("\n") || "Facebook Lead",
        fromMe: false,
        timestamp: toUnix(lead.createdAt),
        media: false,
      },
      ...lead.contactLogs.map((log) => ({
        id: log.id,
        text: `${log.channel}: ${log.message}`,
        fromMe: true,
        timestamp: toUnix(log.createdAt),
        media: false,
      })),
    ];
    return { messages, error: null };
  }

  const thread = await prisma.metaInboxThread.findUnique({
    where: { externalId },
    include: { messages: { orderBy: { sentAt: "asc" } } },
  });
  if (!thread) return { messages: [], error: "Yazışma bulunamadı" };
  if (thread.unreadCount > 0) {
    await prisma.metaInboxThread.update({
      where: { id: thread.id },
      data: { unreadCount: 0 },
    });
  }
  return {
    messages: thread.messages.map((message) => ({
      id: message.id,
      text: message.text,
      fromMe: message.fromPage,
      timestamp: toUnix(message.sentAt),
      media: message.text === "[medya]",
    })),
    error: null,
  };
}

async function graphPost(token: string, path: string, body: Record<string, unknown>) {
  const response = await fetch(`${GRAPH}/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await response.json()) as GraphError & { id?: string };
  if (!response.ok) {
    throw new Error(data.error?.message || `Graph HTTP ${response.status}`);
  }
  return data;
}

export async function replyMetaInbox(externalId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return { error: "Mesaj boş" as string };
  const settings = await prisma.companySettings.findUnique({
    where: { id: "default" },
    select: { facebookLeadPageId: true, facebookLeadPageAccessToken: true },
  });
  const token = settings?.facebookLeadPageAccessToken?.trim() ?? "";
  const pageId = settings?.facebookLeadPageId?.trim() || "";
  if (!token || !pageId) return { error: "Sayfa tokeni yok" };

  const thread = await prisma.metaInboxThread.findUnique({
    where: { externalId },
  });
  if (!thread) return { error: "Yazışma bulunamadı" };

  try {
    if (thread.channel === "messenger" || thread.channel === "instagram") {
      if (!thread.replyExternalId) return { error: "Alıcı yok" };
      await graphPost(token, `${pageId}/messages`, {
        recipient: { id: thread.replyExternalId },
        messaging_type: "RESPONSE",
        message: { text: trimmed },
      });
    } else if (thread.channel === "instagram-comments") {
      if (!thread.replyExternalId) return { error: "Yanıtlanacak yorum yok" };
      await graphPost(token, `${thread.replyExternalId}/replies`, {
        message: trimmed,
      });
    } else if (thread.channel === "facebook-comments") {
      if (!thread.replyExternalId) return { error: "Yanıtlanacak yorum yok" };
      await graphPost(token, `${thread.replyExternalId}/comments`, {
        message: trimmed,
      });
    } else {
      return { error: "Bu kanaldan yanıt gönderilmiyor" };
    }
  } catch (error) {
    return { error: cleanGraphError(error) };
  }

  await saveThread({
    channel: thread.channel as MetaInboxChannel,
    externalId: thread.externalId,
    title: thread.title,
    participantId: thread.participantId,
    replyExternalId: thread.replyExternalId,
    unreadCount: 0,
    permalink: thread.permalink,
    messages: [
      {
        externalId: `local:${thread.externalId}:${Date.now()}`,
        text: trimmed,
        fromPage: true,
        senderName: "Tatil Villacısı",
        sentAt: new Date(),
      },
    ],
  });
  return { success: true as const };
}

type WebhookMessaging = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string };
};

type WebhookFeedValue = {
  item?: string;
  verb?: string;
  post_id?: string;
  comment_id?: string;
  message?: string;
  from?: { id?: string; name?: string };
  created_time?: number;
};

export async function ingestMetaWebhook(payload: unknown) {
  if (!payload || typeof payload !== "object") return { processed: 0 };
  const body = payload as {
    object?: string;
    entry?: Array<{
      id?: string;
      messaging?: WebhookMessaging[];
      changes?: Array<{ field?: string; value?: WebhookFeedValue }>;
    }>;
  };
  if (body.object !== "page" && body.object !== "instagram") return { processed: 0 };

  const settings = await prisma.companySettings.findUnique({
    where: { id: "default" },
    select: { facebookLeadPageId: true },
  });
  const pageId = settings?.facebookLeadPageId?.trim() || "";
  let processed = 0;

  for (const entry of body.entry ?? []) {
    const entryPageId = entry.id || pageId;
    for (const event of entry.messaging ?? []) {
      const senderId = event.sender?.id;
      const recipientId = event.recipient?.id;
      const mid = event.message?.mid;
      if (!senderId || !mid) continue;
      const fromPage = pageId ? senderId === pageId : senderId === entryPageId;
      const psid = fromPage ? recipientId : senderId;
      if (!psid) continue;
      const sentAt = event.timestamp ? new Date(event.timestamp) : new Date();
      const instagram = body.object === "instagram";
      await saveThread({
        channel: instagram ? "instagram" : "messenger",
        externalId: instagram ? `instagram:${psid}` : `messenger:${psid}`,
        title: instagram ? "Instagram" : "Messenger",
        participantId: psid,
        replyExternalId: psid,
        unreadCount: fromPage ? 0 : 1,
        unreadMode: fromPage ? "absolute" : "increment",
        messages: [
          {
            externalId: mid,
            text: messageText(event.message?.text),
            fromPage,
            senderName: "",
            sentAt,
          },
        ],
      });
      processed += 1;
    }

    for (const change of entry.changes ?? []) {
      if (change.field !== "feed" && change.field !== "comments") continue;
      const value = change.value;
      if (!value || value.item !== "comment" || value.verb === "remove") continue;
      if (!value.post_id || !value.comment_id) continue;
      const fromPage = Boolean(pageId && value.from?.id === pageId);
      const sentAt = value.created_time
        ? new Date(value.created_time * 1000)
        : new Date();
      await saveThread({
        channel: "facebook-comments",
        externalId: `post:${value.post_id}`,
        title: "Facebook yorumu",
        participantId: value.from?.id || "",
        replyExternalId: fromPage ? "" : value.comment_id,
        unreadCount: fromPage ? 0 : 1,
        unreadMode: fromPage ? "absolute" : "increment",
        messages: [
          {
            externalId: value.comment_id,
            text: messageText(value.message),
            fromPage,
            senderName: value.from?.name?.trim() || "",
            sentAt,
          },
        ],
      });
      processed += 1;
    }
  }

  return { processed };
}

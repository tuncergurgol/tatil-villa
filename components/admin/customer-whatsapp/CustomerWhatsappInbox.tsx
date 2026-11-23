"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  Search,
  Send,
  Star,
} from "lucide-react";
import {
  loadCustomerInboxProfile,
  loadCustomerWhatsappChats,
  loadCustomerWhatsappThread,
  replyCustomerWhatsapp,
} from "@/app/actions/admin/customer-whatsapp-inbox";
import type { CustomerInboxProfile } from "@/lib/customer-inbox-profile";
import { formatTurkishPhoneDisplay } from "@/lib/phone-utils";
import type {
  CustomerWhatsappChat,
  CustomerWhatsappChatPage,
  CustomerWhatsappMessage,
} from "@/lib/customer-whatsapp-types";

type ChannelId =
  | "all"
  | "messenger"
  | "instagram"
  | "whatsapp"
  | "facebook-comments"
  | "instagram-comments"
  | "facebook-lead";

const CHANNELS: Array<{ id: ChannelId; label: string; live: boolean }> = [
  { id: "all", label: "Tüm mesajlar", live: true },
  { id: "messenger", label: "Messenger", live: false },
  { id: "instagram", label: "Instagram", live: false },
  { id: "whatsapp", label: "WhatsApp", live: true },
  { id: "facebook-comments", label: "Facebook yorumları", live: false },
  { id: "instagram-comments", label: "Instagram yorumları", live: false },
  { id: "facebook-lead", label: "Facebook Lead", live: false },
];

type Props = {
  initial: CustomerWhatsappChatPage;
};

function formatWhen(timestamp: number, withDate = false) {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (!withDate && sameDay) {
    return new Intl.DateTimeFormat("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: withDate ? "2-digit" : undefined,
    minute: withDate ? "2-digit" : undefined,
  }).format(date);
}

function chatTitle(chat: CustomerWhatsappChat) {
  if (chat.customerName) return chat.customerName;
  if (chat.phoneDigits.length === 10) {
    return formatTurkishPhoneDisplay(chat.phoneDigits);
  }
  return chat.title;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toLocaleUpperCase("tr-TR")).join("") || "?";
}

function mergeChats(
  current: CustomerWhatsappChat[],
  incoming: CustomerWhatsappChat[]
) {
  const map = new Map(current.map((chat) => [chat.id, chat]));
  for (const chat of incoming) map.set(chat.id, chat);
  return [...map.values()].sort((left, right) => right.timestamp - left.timestamp);
}

export default function CustomerWhatsappInbox({ initial }: Props) {
  const [channel, setChannel] = useState<ChannelId>("whatsapp");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [chats, setChats] = useState(initial.chats);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [nextOffset, setNextOffset] = useState(initial.nextOffset);
  const [listError, setListError] = useState(initial.error);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CustomerWhatsappMessage[]>([]);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CustomerInboxProfile | null>(null);
  const [isPending, startTransition] = useTransition();
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  const liveChannel = channel === "all" || channel === "whatsapp";
  const activeChannel = CHANNELS.find((item) => item.id === channel) ?? CHANNELS[3];

  const selected = chats.find((chat) => chat.id === selectedId) ?? null;

  const visibleChats = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return chats.filter((chat) => {
      if (unreadOnly && chat.unreadCount <= 0) return false;
      if (!needle) return true;
      const haystack = [chat.title, chat.customerName ?? "", chat.phoneDigits, chat.preview]
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      return haystack.includes(needle);
    });
  }, [chats, query, unreadOnly]);

  function openChat(chatId: string) {
    selectedIdRef.current = chatId;
    setSelectedId(chatId);
    setThreadError(null);
    setSendError(null);
    setMessages([]);
    setProfile(null);
    const chat = chats.find((item) => item.id === chatId);
    startTransition(async () => {
      const [thread, nextProfile] = await Promise.all([
        loadCustomerWhatsappThread(chatId),
        loadCustomerInboxProfile({
          customerId: chat?.customerId,
          phoneDigits: chat?.phoneDigits,
          name: chat ? chatTitle(chat) : "",
        }),
      ]);
      if (selectedIdRef.current !== chatId) return;
      setMessages(thread.messages);
      setThreadError(thread.error);
      setProfile(nextProfile);
    });
  }

  function refreshList(reset = false) {
    startTransition(async () => {
      const page = await loadCustomerWhatsappChats(0);
      setListError(page.error);
      setHasMore((current) => (reset ? page.hasMore : current || page.hasMore));
      setNextOffset((current) =>
        reset ? page.nextOffset : Math.max(current, page.nextOffset)
      );
      setChats((current) => (reset ? page.chats : mergeChats(current, page.chats)));
    });
  }

  function loadMore() {
    startTransition(async () => {
      const page = await loadCustomerWhatsappChats(nextOffset);
      setListError(page.error);
      setHasMore(page.hasMore);
      setNextOffset(page.nextOffset);
      setChats((current) => mergeChats(current, page.chats));
    });
  }

  function sendReply() {
    if (!selected || sending) return;
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setSendError(null);
    startTransition(async () => {
      const result = await replyCustomerWhatsapp(
        selected.id,
        text,
        selected.phoneDigits
      );
      setSending(false);
      if ("error" in result) {
        setSendError(result.error);
        return;
      }
      setDraft("");
      const thread = await loadCustomerWhatsappThread(selected.id);
      if (selectedIdRef.current === selected.id) {
        setMessages(thread.messages);
        setThreadError(thread.error);
      }
      const page = await loadCustomerWhatsappChats(0);
      setChats((current) => mergeChats(current, page.chats));
    });
  }

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, selectedId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void (async () => {
        const page = await loadCustomerWhatsappChats(0);
        setListError(page.error);
        setChats((current) => mergeChats(current, page.chats));
        const openId = selectedIdRef.current;
        if (!openId) return;
        const thread = await loadCustomerWhatsappThread(openId);
        if (selectedIdRef.current !== openId) return;
        setMessages(thread.messages);
        setThreadError(thread.error);
      })();
    }, 25000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      data-no-page-refresh
      className="flex h-[calc(100dvh-5.5rem)] min-h-[36rem] flex-col overflow-hidden rounded-2xl border border-[#d8dee8] bg-white shadow-sm lg:h-[calc(100dvh-6.5rem)]"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e6ebf2] px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Gelen Kutusu</h1>
          <p className="text-xs text-gray-500">
            {initial.lineLabel}
            {initial.connectedName ? ` · ${initial.connectedName}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refreshList(false)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          Yenile
        </button>
      </div>

      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#e6ebf2] px-3">
        {CHANNELS.map((item) => {
          const active = item.id === channel;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setChannel(item.id);
                if (!item.live) {
                  selectedIdRef.current = null;
                  setSelectedId(null);
                }
              }}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium ${
                active
                  ? "border-[#1877f2] text-[#1877f2]"
                  : "border-transparent text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {listError && liveChannel ? (
        <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-sm text-red-700">
          {listError}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside
          className={`flex w-full min-w-0 flex-col border-[#e6ebf2] md:w-[22rem] md:border-r ${
            selected && liveChannel ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="shrink-0 space-y-2 border-b border-[#eef2f6] p-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ara"
                className="w-full rounded-lg border border-gray-200 bg-[#f5f7fa] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#1877f2] focus:bg-white"
              />
            </label>
            {liveChannel ? (
              <button
                type="button"
                onClick={() => setUnreadOnly((value) => !value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  unreadOnly
                    ? "bg-[#e7f3ff] text-[#1877f2]"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                Okunmamış
              </button>
            ) : null}
          </div>

          {liveChannel ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {visibleChats.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-gray-500">
                  Sohbet bulunamadı.
                </p>
              ) : (
                visibleChats.map((chat) => {
                  const title = chatTitle(chat);
                  const active = chat.id === selectedId;
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => openChat(chat.id)}
                      className={`flex w-full items-start gap-3 border-b border-[#f2f4f7] px-3 py-3 text-left ${
                        active ? "bg-[#e7f3ff]" : "hover:bg-[#f7f8fa]"
                      }`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d8f3dc] text-sm font-semibold text-emerald-800">
                        {initials(title)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-gray-900">
                            {title}
                          </span>
                          <span className="shrink-0 text-[11px] text-gray-400">
                            {formatWhen(chat.timestamp)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <MessageCircle className="h-3 w-3" />
                          WhatsApp
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-gray-500">
                            {chat.fromMe && chat.preview ? "Siz: " : ""}
                            {chat.preview || "Mesaj yok"}
                          </span>
                          {chat.unreadCount > 0 ? (
                            <span className="shrink-0 rounded-full bg-[#1877f2] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
              {hasMore && !query.trim() ? (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isPending}
                  className="w-full px-4 py-3 text-sm font-medium text-[#1877f2] hover:bg-[#f5f8ff] disabled:opacity-60"
                >
                  Daha eski sohbetler
                </button>
              ) : null}
            </div>
          ) : (
            <ChannelPreview channel={activeChannel.label} />
          )}
        </aside>

        <section
          className={`min-w-0 flex-1 flex-col bg-[#f0f2f5] ${
            selected && liveChannel ? "flex" : "hidden md:flex"
          }`}
        >
          {liveChannel && selected ? (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-[#e6ebf2] bg-white px-3 py-3">
                <button
                  type="button"
                  onClick={() => {
                    selectedIdRef.current = null;
                    setSelectedId(null);
                  }}
                  className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
                  aria-label="Sohbet listesine dön"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d8f3dc] text-xs font-semibold text-emerald-800">
                  {initials(chatTitle(selected))}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {chatTitle(selected)}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    WhatsApp · {initial.lineLabel}
                  </p>
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
                {isPending && messages.length === 0 ? (
                  <div className="flex justify-center py-10 text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : null}
                {threadError ? (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                    {threadError}
                  </p>
                ) : null}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.fromMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                        message.fromMe
                          ? "rounded-br-md bg-[#d9fdd3] text-gray-900"
                          : "rounded-bl-md bg-white text-gray-900"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.text}</p>
                      <p className="mt-1 text-right text-[10px] text-gray-400">
                        {message.timestamp ? formatWhen(message.timestamp, true) : ""}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form
                className="shrink-0 border-t border-[#e6ebf2] bg-white p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendReply();
                }}
              >
                {sendError ? (
                  <p className="mb-2 text-sm text-red-600">{sendError}</p>
                ) : null}
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendReply();
                      }
                    }}
                    rows={2}
                    placeholder="WhatsApp'tan yanıtla..."
                    className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-gray-200 bg-[#f5f7fa] px-3 py-2 text-sm outline-none focus:border-[#1877f2] focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#1877f2] px-4 text-sm font-semibold text-white hover:bg-[#166fe0] disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Gönder
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-8 text-center">
              {liveChannel ? (
                <p className="max-w-sm text-sm text-gray-500">
                  Soldan bir WhatsApp sohbeti seçin. Sağ panelde misafirin
                  rezervasyonları ve sadakat bilgisi açılır.
                </p>
              ) : (
                <ChannelPreview channel={activeChannel.label} large />
              )}
            </div>
          )}
        </section>

        <aside
          className={`hidden w-[19rem] shrink-0 flex-col border-l border-[#e6ebf2] bg-white ${
            liveChannel && selected ? "xl:flex" : ""
          }`}
        >
          {selected ? (
            <GuestPanel
              title={chatTitle(selected)}
              phone={selected.phoneDigits}
              profile={profile}
              loading={isPending && !profile}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function ChannelPreview({
  channel,
  large = false,
}: {
  channel: string;
  large?: boolean;
}) {
  return (
    <div className={`flex flex-1 flex-col items-center justify-center px-6 text-center ${large ? "py-16" : "py-12"}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e7f3ff] text-[#1877f2]">
        <MessagesSquare className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-gray-900">{channel}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-gray-500">
        Bu kanalın ön tasarımı hazır. Bağlantı kurulunca yazışmalar bu gelen
        kutusunda, sağdaki misafir kartıyla birlikte görünecek.
      </p>
    </div>
  );
}

function GuestPanel({
  title,
  phone,
  profile,
  loading,
}: {
  title: string;
  phone: string;
  profile: CustomerInboxProfile | null;
  loading: boolean;
}) {
  const name = profile?.name || title;
  const phoneLabel =
    profile?.phone ||
    (phone.length === 10 ? formatTurkishPhoneDisplay(phone) : phone);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="border-b border-[#eef2f6] px-4 py-5 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#d8f3dc] text-lg font-semibold text-emerald-800">
          {initials(name)}
        </span>
        <p className="mt-3 text-base font-semibold text-gray-900">{name}</p>
        <p className="text-xs text-gray-500">{phoneLabel || "Telefon yok"}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : null}

      <section className="border-b border-[#eef2f6] px-4 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Hakkında
        </h2>
        <p className="mt-2 text-sm text-gray-700">
          {profile?.email || "E-posta kayıtlı değil"}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {profile?.customerId ? "Kayıtlı müşteri" : "Müşteri kaydı eşleşmedi"}
        </p>
        {profile?.blacklisted ? (
          <p className="mt-2 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
            Kara listede
          </p>
        ) : null}
      </section>

      <section className="border-b border-[#eef2f6] px-4 py-4">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
          <Star className="h-3.5 w-3.5" />
          Sadakat
        </h2>
        {profile?.loyaltyLabel ? (
          <div className="mt-2 space-y-1 text-sm text-gray-800">
            <p>
              {profile.loyaltyEmoji} {profile.loyaltyLabel}
            </p>
            <p>Bakiye: {(profile.couponBalance ?? 0).toLocaleString("tr-TR")} TL</p>
            <p>Konaklama: {profile.completedStays ?? 0}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">Sadakat kaydı yok</p>
        )}
      </section>

      <section className="px-4 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Rezervasyonlar
        </h2>
        {profile && profile.reservations.length > 0 ? (
          <div className="mt-2 space-y-2">
            {profile.reservations.map((reservation) => (
              <Link
                key={reservation.id}
                href={`/admin/rezervasyonlar/${reservation.id}`}
                className="block rounded-xl border border-[#e6ebf2] px-3 py-2 hover:bg-[#f7f8fa]"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-gray-900">
                    {reservation.villaName}
                  </span>
                  <span className="shrink-0 text-[11px] text-gray-400">
                    {reservation.code}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  {reservation.checkIn} – {reservation.checkOut}
                </span>
                <span className="mt-1 flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${reservation.statusClass}`}>
                    {reservation.status}
                  </span>
                  <span className="text-xs font-medium text-gray-700">
                    {reservation.totalPrice}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">Rezervasyon bulunamadı</p>
        )}
      </section>
    </div>
  );
}

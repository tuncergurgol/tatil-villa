"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, Loader2, MessageCircle, RefreshCw, Search, Send } from "lucide-react";
import {
  loadCustomerWhatsappChats,
  loadCustomerWhatsappThread,
  replyCustomerWhatsapp,
} from "@/app/actions/admin/customer-whatsapp-inbox";
import { formatTurkishPhoneDisplay } from "@/lib/phone-utils";
import type {
  CustomerWhatsappChat,
  CustomerWhatsappChatPage,
  CustomerWhatsappMessage,
} from "@/lib/customer-whatsapp-types";

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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function chatTitle(chat: CustomerWhatsappChat) {
  if (chat.customerName) return chat.customerName;
  if (chat.phoneDigits.length === 10) {
    return formatTurkishPhoneDisplay(chat.phoneDigits);
  }
  return chat.title;
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
  const [chats, setChats] = useState(initial.chats);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [nextOffset, setNextOffset] = useState(initial.nextOffset);
  const [listError, setListError] = useState(initial.error);
  const [connectedName, setConnectedName] = useState(initial.connectedName);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CustomerWhatsappMessage[]>([]);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);

  const selected = chats.find((chat) => chat.id === selectedId) ?? null;

  const visibleChats = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    if (!needle) return chats;
    return chats.filter((chat) => {
      const haystack = [
        chat.title,
        chat.customerName ?? "",
        chat.phoneDigits,
        chat.preview,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      return haystack.includes(needle);
    });
  }, [chats, query]);

  function openChat(chatId: string) {
    selectedIdRef.current = chatId;
    setSelectedId(chatId);
    setThreadError(null);
    setSendError(null);
    setMessages([]);
    startTransition(async () => {
      const thread = await loadCustomerWhatsappThread(chatId);
      if (selectedIdRef.current !== chatId) return;
      setMessages(thread.messages);
      setThreadError(thread.error);
    });
  }

  function refreshList(reset = false) {
    startTransition(async () => {
      const page = await loadCustomerWhatsappChats(0);
      setListError(page.error);
      setConnectedName(page.connectedName);
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
        setConnectedName(page.connectedName);
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
      className="flex h-[calc(100dvh-5.5rem)] min-h-[32rem] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:h-[calc(100dvh-6.5rem)]"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-gray-900">
              Müşteri WhatsApp
            </h1>
            <p className="truncate text-xs text-gray-500">
              {initial.lineLabel}
              {connectedName ? ` · ${connectedName}` : ""}
              {" · birebir sohbetler"}
            </p>
          </div>
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

      {listError ? (
        <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
          {listError}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside
          className={`flex w-full min-w-0 flex-col border-gray-100 md:w-[22rem] md:border-r ${
            selected ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="shrink-0 p-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="İsim veya numara ara"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {visibleChats.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                {listError ? "Sohbet listesi alınamadı." : "Sohbet bulunamadı."}
              </p>
            ) : (
              visibleChats.map((chat) => {
                const active = chat.id === selectedId;
                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => openChat(chat.id)}
                    className={`flex w-full flex-col gap-1 border-b border-gray-50 px-4 py-3 text-left transition ${
                      active ? "bg-emerald-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-gray-900">
                        {chatTitle(chat)}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-400">
                        {formatWhen(chat.timestamp)}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-gray-500">
                        {chat.fromMe && chat.preview ? "Hat: " : ""}
                        {chat.preview || "Mesaj yok"}
                      </span>
                      {chat.unreadCount > 0 ? (
                        <span className="shrink-0 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                        </span>
                      ) : null}
                    </span>
                    {chat.customerName && chat.phoneDigits ? (
                      <span className="truncate text-[11px] text-emerald-700">
                        {formatTurkishPhoneDisplay(chat.phoneDigits)}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
            {hasMore && !query.trim() ? (
              <button
                type="button"
                onClick={loadMore}
                disabled={isPending}
                className="w-full px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
              >
                Daha eski sohbetler
              </button>
            ) : null}
          </div>
        </aside>

        <section
          className={`min-w-0 flex-1 flex-col bg-[#f6f7f4] ${
            selected ? "flex" : "hidden md:flex"
          }`}
        >
          {selected ? (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-3 sm:px-4">
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
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {chatTitle(selected)}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {selected.phoneDigits
                      ? formatTurkishPhoneDisplay(selected.phoneDigits)
                      : selected.title}
                    {selected.customerName ? " · kayıtlı müşteri" : ""}
                  </p>
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-5">
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
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[70%] ${
                        message.fromMe
                          ? "rounded-br-md bg-emerald-600 text-white"
                          : "rounded-bl-md bg-white text-gray-900"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.text}</p>
                      <p
                        className={`mt-1 text-[10px] ${
                          message.fromMe ? "text-emerald-100" : "text-gray-400"
                        }`}
                      >
                        {message.fromMe ? "Hat" : "Müşteri"}
                        {message.timestamp ? ` · ${formatWhen(message.timestamp, true)}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form
                className="shrink-0 border-t border-gray-200 bg-white p-3"
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
                    placeholder="0252 hattından cevap yazın"
                    className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
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
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-500">
              Soldan bir müşteri sohbeti seçin. Bu ekran 0252 618 01 08 hattındaki
              birebir yazışmaları gösterir.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

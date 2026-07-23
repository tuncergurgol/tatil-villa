"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type VillaResult = {
  name: string;
  region: string;
  nights: number;
  totalPrice: string;
  checkIn: string;
  checkOut: string;
  link: string;
  image?: string;
};

type TatilAssistantWidgetProps = {
  welcomeMessage: string;
};

function BeeMascot({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="32" cy="38" rx="18" ry="14" fill="#FBBF24" />
      <ellipse cx="32" cy="38" rx="18" ry="14" stroke="#D97706" strokeWidth="2" />
      <rect x="18" y="34" width="28" height="4" rx="2" fill="#1F2937" />
      <rect x="18" y="42" width="28" height="4" rx="2" fill="#1F2937" />
      <circle cx="32" cy="22" r="12" fill="#FBBF24" stroke="#D97706" strokeWidth="2" />
      <circle cx="28" cy="20" r="2.5" fill="#111827" />
      <circle cx="36" cy="20" r="2.5" fill="#111827" />
      <path
        d="M30 25c2 2 6 2 8 0"
        stroke="#111827"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <ellipse cx="20" cy="16" rx="8" ry="4" fill="white" fillOpacity="0.65" />
      <ellipse cx="44" cy="16" rx="8" ry="4" fill="white" fillOpacity="0.65" />
      <path d="M18 12c-6-4-10 0-8 6" stroke="#9CA3AF" strokeWidth="2" />
      <path d="M46 12c6-4 10 0 8 6" stroke="#9CA3AF" strokeWidth="2" />
    </svg>
  );
}

export default function TatilAssistantWidget({
  welcomeMessage,
}: TatilAssistantWidgetProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: welcomeMessage },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [villas, setVillas] = useState<VillaResult[]>([]);
  const [wiggle, setWiggle] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const hideOnPage =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/giris-bilgilendirme") ||
    pathname?.startsWith("/rezervasyon-onay");

  useEffect(() => {
    if (hideOnPage) return;
    const tick = () => {
      setWiggle(true);
      window.setTimeout(() => setWiggle(false), 900);
    };
    const first = window.setTimeout(tick, 3000);
    const interval = window.setInterval(tick, 18000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [hideOnPage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, villas, loading, open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/tatil-asistani/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text }),
      });
      const data = (await res.json()) as {
        conversationId?: string;
        reply?: string;
        villas?: VillaResult[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Yanıt alınamadı");
      }

      if (data.conversationId) setConversationId(data.conversationId);
      if (data.villas?.length) setVillas(data.villas);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply ?? "Yanıt oluşturulamadı.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Bir sorun oluştu. Lütfen tekrar deneyin.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, input, loading]);

  if (hideOnPage) return null;

  return (
    <>
      <div className="fixed bottom-20 right-4 z-[65] sm:bottom-6 sm:right-6">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Tatil Asistanı"
            className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 shadow-[0_14px_40px_-12px_rgba(245,158,11,0.8)] ring-4 ring-white transition hover:scale-105"
            style={
              wiggle
                ? { animation: "callback-float-wiggle 0.85s ease-in-out" }
                : undefined
            }
          >
            <BeeMascot className="h-11 w-11 drop-shadow" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white ring-2 ring-white">
              AI
            </span>
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-end p-3 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]"
            aria-label="Kapat"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-[min(640px,calc(100vh-1.5rem))] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3">
              <BeeMascot className="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900">Tatil Asistanı</p>
                <p className="truncate text-xs text-gray-600">
                  YumYum 🐝 Villa & tatil rehberiniz
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-white/80"
                aria-label="Kapat"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((msg, index) => (
                <div
                  key={`${msg.role}-${index}`}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-amber-500 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {villas.length > 0 ? (
                <div className="space-y-2 rounded-2xl border border-amber-100 bg-amber-50/50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Uygun villalar
                  </p>
                  {villas.map((villa) => (
                    <Link
                      key={villa.link}
                      href={villa.link}
                      target="_blank"
                      className="block rounded-xl border border-white bg-white p-3 shadow-sm transition hover:border-amber-200"
                    >
                      <p className="font-semibold text-gray-900">{villa.name}</p>
                      <p className="text-xs text-gray-600">
                        {villa.region} · {villa.checkIn} → {villa.checkOut} ·{" "}
                        {villa.nights} gece
                      </p>
                      <p className="mt-1 text-sm font-bold text-amber-700">
                        {villa.totalPrice}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : null}

              {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MessageCircle className="size-4 animate-pulse" />
                  YumYum düşünüyor...
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>

            <form
              className="border-t border-gray-100 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage();
              }}
            >
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={2}
                  placeholder="Mesajınızı yazın..."
                  className="max-h-28 flex-1 resize-none rounded-2xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white disabled:opacity-50"
                  aria-label="Gönder"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

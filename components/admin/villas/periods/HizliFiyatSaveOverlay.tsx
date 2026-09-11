"use client";

import { useEffect, useState } from "react";

const SAVE_MESSAGES = [
  "Tarihler birebir yazılıyor…",
  "Kesişen periyotlar düzenleniyor…",
  "Artan günler yeni periyoda ayrılıyor…",
  "Fiyatlar kaydediliyor…",
];

export default function HizliFiyatSaveOverlay({
  open,
  dirtyCount,
}: {
  open: boolean;
  dirtyCount: number;
}) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setMessageIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % SAVE_MESSAGES.length);
    }, 1600);

    return () => window.clearInterval(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[3px]"
      role="alertdialog"
      aria-live="polite"
      aria-busy="true"
      aria-label="Periyotlar kaydediliyor"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white px-6 py-8 text-center shadow-2xl">
        <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-violet-200/70 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-8 h-36 w-36 rounded-full bg-teal-200/70 blur-2xl" />

        <div className="relative mx-auto mb-5 h-36 w-44">
          <div className="absolute inset-x-8 top-2 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg">
            <div className="flex h-7 items-center justify-center gap-1 rounded-t-2xl bg-white/15">
              {Array.from({ length: 5 }).map((_, index) => (
                <span
                  key={index}
                  className="h-1.5 w-1.5 rounded-full bg-white/80"
                  style={{
                    animation: `hf-twinkle 1.4s ${index * 0.12}s infinite`,
                  }}
                />
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1.5 px-3 pt-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <span
                  key={index}
                  className="h-3 rounded-sm bg-white/35"
                  style={{
                    animation: `hf-fill 1.6s ${index * 0.08}s ease-in-out infinite`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="absolute bottom-2 left-2 h-16 w-20 rounded-xl bg-gradient-to-b from-teal-400 to-teal-600 shadow-md">
            <div className="mx-auto mt-2 h-5 w-8 rounded-t-md bg-teal-200/80" />
            <div className="mx-auto mt-1 h-6 w-10 rounded-md bg-amber-100" />
          </div>

          <span className="absolute right-3 top-10 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-violet-700 shadow-sm [animation:hf-float_2.2s_ease-in-out_infinite]">
            01→10
          </span>
          <span className="absolute bottom-6 right-4 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700 shadow-sm [animation:hf-float_2.6s_ease-in-out_infinite_reverse]">
            Tam tarih
          </span>
        </div>

        <p className="relative text-lg font-bold text-gray-900">
          Periyotlar kaydediliyor
        </p>
        <p className="relative mt-1 text-sm text-gray-500">
          {dirtyCount} değişiklik uygulanıyor. Lütfen bekleyin.
        </p>
        <p className="relative mt-4 h-5 text-sm font-medium text-violet-700">
          {SAVE_MESSAGES[messageIndex]}
        </p>
        <div className="relative mx-auto mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-violet-100">
          <span className="absolute inset-y-0 w-1/3 rounded-full bg-violet-500 [animation:hf-bar_1.2s_ease-in-out_infinite]" />
        </div>
      </div>

      <style>{`
        @keyframes hf-twinkle {
          0%, 100% { opacity: 0.35; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes hf-fill {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
        @keyframes hf-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes hf-bar {
          0% { left: -35%; }
          100% { left: 110%; }
        }
      `}</style>
    </div>
  );
}

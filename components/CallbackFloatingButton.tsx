"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { Phone, X } from "lucide-react";

const CallbackRequestFormPublic = dynamic(
  () => import("@/components/corporate/CallbackRequestFormPublic"),
  { ssr: false }
);

export default function CallbackFloatingButton() {
  const pathname = usePathname();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [wiggle, setWiggle] = useState(false);

  const hideOnPage =
    pathname === "/sizi-arayalim" ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/giris-bilgilendirme") ||
    pathname?.startsWith("/rezervasyon-onay");

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (hideOnPage) return;
    const tick = () => {
      setWiggle(true);
      window.setTimeout(() => setWiggle(false), 900);
    };
    const first = window.setTimeout(tick, 2500);
    const interval = window.setInterval(tick, 14000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [hideOnPage]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  if (hideOnPage) return null;

  return (
    <>
      <div className="fixed bottom-5 left-5 z-[60] hidden sm:block sm:bottom-6 sm:left-6">
        <span
          className="pointer-events-none absolute -inset-2 rounded-full bg-[#e85d04]/25 blur-md"
          aria-hidden
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-br from-[#ff7a1a] via-[#e85d04] to-[#d9480f] py-3 pl-3 pr-5 text-sm font-bold text-white shadow-[0_14px_36px_-10px_rgba(232,93,4,0.7)] transition hover:scale-[1.04] hover:shadow-[0_18px_40px_-10px_rgba(232,93,4,0.8)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e85d04]"
          style={
            wiggle
              ? { animation: "callback-float-wiggle 0.85s ease-in-out" }
              : undefined
          }
        >
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30">
            <span className="absolute inset-0 animate-ping rounded-full bg-white/25" />
            <Phone
              className="relative h-5 w-5 drop-shadow-sm transition group-hover:rotate-12"
              aria-hidden
            />
          </span>
          <span className="pr-0.5 text-left leading-tight">
            Sizi Arayalım
            <span className="block text-[11px] font-semibold text-white/90">
              Ücretsiz geri arama
            </span>
          </span>
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#0a3d4a]/55 backdrop-blur-[2px]"
            aria-label="Kapat"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-[#0d5c63]/15 bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="shrink-0 bg-gradient-to-br from-[#0a3d4a] via-[#0d5c63] to-[#14919b] px-5 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id={titleId} className="text-lg font-bold">
                    Sizi Arayalım
                  </h2>
                  <p className="mt-0.5 text-sm text-white/80">
                    Kod gelir → doğrula → biz ararız.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-full bg-white/15 p-2 hover:bg-white/25"
                  aria-label="Kapat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <CallbackRequestFormPublic
                compact
                onSuccess={() => {
                  window.setTimeout(close, 2200);
                }}
              />
              <p className="mt-4 text-center text-xs text-[#1a4a5c]/60">
                Detaylı sayfa:{" "}
                <Link
                  href="/sizi-arayalim"
                  className="font-semibold text-[#e85d04] underline-offset-2 hover:underline"
                  onClick={close}
                >
                  Sizi Arayalım
                </Link>
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

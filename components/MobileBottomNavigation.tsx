"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarCheck,
  CalendarSearch,
  Home,
  MessageCircle,
  PhoneCall,
  PhoneIncoming,
} from "lucide-react";
import { normalizePhoneToE164, toWhatsAppRecipient } from "@/lib/phone";

type MobileBottomNavigationProps = {
  phone: string;
  whatsapp: string;
};

const itemClass =
  "group flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2 text-[10px] font-medium leading-tight text-slate-600 transition active:scale-95";
const iconWrapClass =
  "flex h-9 w-9 items-center justify-center rounded-xl transition group-active:bg-rose-100";

export default function MobileBottomNavigation({
  phone,
  whatsapp,
}: MobileBottomNavigationProps) {
  const pathname = usePathname();
  const [isVillaDetail, setIsVillaDetail] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsVillaDetail(
        document.querySelector("[data-villa-detail-page]") !== null
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const hidden =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/giris-bilgilendirme") ||
    pathname?.startsWith("/rezervasyon-onay") ||
    pathname === "/onay";

  if (hidden) return null;

  const phoneE164 = normalizePhoneToE164(phone);
  const whatsappE164 = normalizePhoneToE164(whatsapp || phone);
  const whatsappRecipient = toWhatsAppRecipient(whatsappE164);

  function scrollToReservation() {
    document
      .getElementById("rezervasyon-yap")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <div
        aria-hidden
        className="h-[calc(5.25rem+env(safe-area-inset-bottom))] sm:hidden"
      />
      <nav
        aria-label="Mobil hızlı işlemler"
        className="fixed inset-x-0 bottom-0 z-[65] overflow-hidden rounded-t-[1.75rem] border-t border-rose-200/80 bg-[#fff0f1]/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_35px_rgba(136,19,55,0.15)] backdrop-blur-xl sm:hidden"
      >
        <div className="mx-auto grid h-[5rem] max-w-lg grid-cols-5">
          <Link href="/" className={itemClass}>
            <span
              className={`${iconWrapClass} ${
                pathname === "/" ? "bg-white text-rose-600 shadow-sm" : ""
              }`}
            >
              <Home className="h-[22px] w-[22px]" strokeWidth={1.8} />
            </span>
            <span className={pathname === "/" ? "font-semibold text-rose-700" : ""}>
              Ana Sayfa
            </span>
          </Link>

          <Link href="/sizi-arayalim" className={itemClass}>
            <span className={iconWrapClass}>
              <PhoneIncoming className="h-[22px] w-[22px]" strokeWidth={1.8} />
            </span>
            <span>Sizi Arayalım</span>
          </Link>

          <div className="flex min-w-0 justify-center">
            {isVillaDetail ? (
              <button
                type="button"
                onClick={scrollToReservation}
                className={`${itemClass} w-full text-rose-700`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-[0_6px_16px_rgba(244,63,94,0.3)]">
                  <CalendarCheck className="h-6 w-6" strokeWidth={1.8} />
                </span>
                <span className="max-w-[4.7rem] text-center font-semibold leading-tight">
                  Rezervasyon Yap
                </span>
              </button>
            ) : (
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById(
                  "header-villa-search-input"
                ) as HTMLInputElement | null;
                input?.scrollIntoView({ behavior: "smooth", block: "center" });
                window.setTimeout(() => input?.focus(), 250);
              }}
              className={`${itemClass} w-full text-rose-700`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-[0_6px_16px_rgba(244,63,94,0.3)]">
                <CalendarSearch className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <span className="font-semibold leading-tight">Villa Ara</span>
            </button>
          )}
          </div>

          <a
            href={phoneE164 ? `tel:${phoneE164}` : undefined}
            className={itemClass}
            aria-disabled={!phoneE164}
          >
            <span className={iconWrapClass}>
              <PhoneCall className="h-[22px] w-[22px]" strokeWidth={1.8} />
            </span>
            <span>Telefon</span>
          </a>

          <a
            href={
              whatsappRecipient
                ? `https://wa.me/${whatsappRecipient}`
                : undefined
            }
            target="_blank"
            rel="noreferrer"
            className={itemClass}
            aria-disabled={!whatsappRecipient}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-emerald-600 shadow-sm">
              <MessageCircle className="h-[22px] w-[22px]" strokeWidth={2} />
            </span>
            <span>WhatsApp</span>
          </a>
        </div>
      </nav>
    </>
  );
}

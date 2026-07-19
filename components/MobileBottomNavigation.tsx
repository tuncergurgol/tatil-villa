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

const sideItemClass =
  "flex min-w-0 flex-col items-center justify-end gap-1 px-0.5 pb-2 pt-3 text-[10px] font-medium leading-tight text-slate-600 transition active:scale-95";

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
        className="h-[calc(5.5rem+env(safe-area-inset-bottom))] sm:hidden"
      />
      <nav
        aria-label="Mobil hızlı işlemler"
        className="fixed inset-x-0 bottom-0 z-[65] border-t border-sky-100 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_35px_rgba(15,23,42,0.13)] backdrop-blur-xl sm:hidden"
      >
        <div className="mx-auto grid h-[5.25rem] max-w-lg grid-cols-5">
          <Link href="/" className={sideItemClass}>
            <Home className="h-6 w-6 text-slate-700" strokeWidth={1.9} />
            <span>Ana Sayfa</span>
          </Link>

          <Link href="/sizi-arayalim" className={sideItemClass}>
            <PhoneIncoming
              className="h-6 w-6 text-slate-700"
              strokeWidth={1.9}
            />
            <span>Sizi Arayalım</span>
          </Link>

          <div className="relative flex min-w-0 justify-center">
            {isVillaDetail ? (
              <button
                type="button"
                onClick={scrollToReservation}
                className="absolute -top-4 flex h-[5.65rem] w-[5.65rem] flex-col items-center justify-center gap-1 rounded-full border-[5px] border-white bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 text-white shadow-[0_10px_25px_rgba(14,165,233,0.38)] transition active:scale-95"
              >
                <CalendarCheck className="h-7 w-7" strokeWidth={1.8} />
                <span className="max-w-[4.6rem] text-center text-[10px] font-semibold leading-tight">
                  Rezervasyon Yap
                </span>
              </button>
            ) : (
              <Link
                href="/villalar"
                className="absolute -top-4 flex h-[5.65rem] w-[5.65rem] flex-col items-center justify-center gap-1 rounded-full border-[5px] border-white bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 text-white shadow-[0_10px_25px_rgba(14,165,233,0.38)] transition active:scale-95"
              >
                <CalendarSearch className="h-7 w-7" strokeWidth={1.8} />
                <span className="text-[10px] font-semibold leading-tight">
                  Villa Ara
                </span>
              </Link>
            )}
          </div>

          <a
            href={phoneE164 ? `tel:${phoneE164}` : undefined}
            className={sideItemClass}
            aria-disabled={!phoneE164}
          >
            <PhoneCall className="h-6 w-6 text-slate-700" strokeWidth={1.9} />
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
            className={sideItemClass}
            aria-disabled={!whatsappRecipient}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <MessageCircle className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span>WhatsApp</span>
          </a>
        </div>
      </nav>
    </>
  );
}

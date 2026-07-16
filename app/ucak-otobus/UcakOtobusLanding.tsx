"use client";

import Link from "next/link";
import { Bus, Building2, Headphones, Lock, Plane, Ticket, Zap } from "lucide-react";
import { Nunito, Fraunces } from "next/font/google";
import { BILET_PUBLIC_ROUTES } from "@/lib/biletall";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-ucak-body",
  weight: ["400", "600", "700", "800"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-ucak-display",
  weight: ["600", "700"],
});

const cards = [
  {
    badge: "YENİ",
    badgeClass: "bg-sky-600 text-white",
    accent: "sky",
    icon: Plane,
    iconGrad: "from-sky-400 to-cyan-400",
    blob: "bg-sky-100/70",
    title: "Uçak Bileti",
    description:
      "Tüm havayolları tek ekranda — en uygun fiyatlı uçuşu saniyeler içinde bul, anında e-biletini al.",
    href: BILET_PUBLIC_ROUTES.ara,
    ctaClass: "text-sky-700",
    btnClass: "bg-sky-500 hover:bg-sky-600",
  },
  {
    badge: "POPÜLER",
    badgeClass: "bg-orange-500 text-white",
    accent: "orange",
    icon: Bus,
    iconGrad: "from-orange-400 to-amber-300",
    blob: "bg-orange-100/70",
    title: "Otobüs Bileti",
    description:
      "Türkiye’nin her noktasına — tüm otobüs firmalarının seferlerini karşılaştır, koltuğunu seç, ödemeni yap.",
    href: BILET_PUBLIC_ROUTES.ara,
    ctaClass: "text-orange-700",
    btnClass: "bg-orange-500 hover:bg-orange-600",
  },
  {
    badge: "7/24",
    badgeClass: "bg-emerald-500 text-white",
    accent: "emerald",
    icon: Ticket,
    iconGrad: "from-emerald-400 to-teal-400",
    blob: "bg-emerald-100/70",
    title: "PNR Sorgula",
    description:
      "Biletin elinin altında olsun — PNR ile rezervasyonunu görüntüle, e-biletini cebine indir.",
    href: BILET_PUBLIC_ROUTES.sonuc,
    ctaClass: "text-emerald-700",
    btnClass: "bg-emerald-500 hover:bg-emerald-600",
  },
] as const;

const trust = [
  { icon: Lock, label: "256-bit SSL Güvenli Ödeme", color: "text-orange-500" },
  { icon: Zap, label: "Anında E-Bilet", color: "text-amber-500" },
  { icon: Headphones, label: "7/24 Müşteri Desteği", color: "text-rose-500" },
  { icon: Building2, label: "Tüm Firmalar Tek Ekranda", color: "text-slate-500" },
] as const;

type UcakOtobusLandingProps = {
  enabled?: boolean;
};

export default function UcakOtobusLanding({
  enabled = true,
}: UcakOtobusLandingProps) {
  return (
    <div
      className={`${nunito.variable} ${fraunces.variable} relative overflow-hidden`}
      style={{ fontFamily: "var(--font-ucak-body), system-ui, sans-serif" }}
    >
      <style>{`
        @keyframes ucak-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ucak-soft-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .ucak-anim-hero {
          animation: ucak-fade-up 0.7s ease-out both;
        }
        .ucak-anim-card {
          animation: ucak-soft-in 0.65s ease-out both;
        }
        .ucak-anim-trust {
          animation: ucak-fade-up 0.7s ease-out 0.35s both;
        }
        @media (prefers-reduced-motion: reduce) {
          .ucak-anim-hero, .ucak-anim-card, .ucak-anim-trust {
            animation: none;
          }
        }
      `}</style>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(125,211,252,0.28),transparent_50%),radial-gradient(ellipse_at_85%_10%,rgba(253,186,116,0.22),transparent_45%),radial-gradient(ellipse_at_50%_100%,rgba(167,243,208,0.2),transparent_40%)]"
      />

      <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="ucak-anim-hero mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/80 bg-white/80 px-3.5 py-1 text-xs font-bold tracking-wide text-sky-700 shadow-sm backdrop-blur">
            <span aria-hidden>✨</span> Yeni Hizmet
          </span>

          <h1
            className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-800 sm:text-4xl md:text-5xl"
            style={{ fontFamily: "var(--font-ucak-display), Georgia, serif" }}
          >
            Sadece tatil değil —{" "}
            <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-orange-400 bg-clip-text text-transparent">
              bileti de bizden
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">
            Uçak, otobüs ve PNR sorgulama — tüm seyahat biletlerin tek tıkla.
            Tatil planını burada başlat, biletini de burada al.
          </p>
        </div>

        {!enabled ? (
          <p className="mx-auto mt-10 max-w-lg rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-center text-sm text-amber-900">
            Bilet satışı şu an geçici olarak kapalı. Kısa süre içinde tekrar
            aktif olacak.
          </p>
        ) : (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card, index) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="ucak-anim-card group relative flex flex-col overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.18)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_-16px_rgba(15,23,42,0.22)]"
                  style={{ animationDelay: `${120 + index * 90}ms` }}
                >
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute -right-8 -top-10 size-40 rounded-full ${card.blob} blur-2xl`}
                  />

                  <span
                    className={`relative z-10 inline-flex w-fit rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wider ${card.badgeClass}`}
                  >
                    {card.badge}
                  </span>

                  <div
                    className={`relative z-10 mt-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${card.iconGrad} text-white shadow-md`}
                  >
                    <Icon className="size-7" strokeWidth={2.2} />
                  </div>

                  <h2 className="relative z-10 mt-5 text-xl font-extrabold text-slate-800">
                    {card.title}
                  </h2>
                  <p className="relative z-10 mt-2 flex-1 text-sm leading-relaxed text-slate-500">
                    {card.description}
                  </p>

                  <Link
                    href={card.href}
                    className={`relative z-10 mt-6 inline-flex items-center gap-3 text-sm font-bold ${card.ctaClass}`}
                  >
                    Hemen Ara
                    <span
                      className={`inline-flex size-8 items-center justify-center rounded-full text-white transition group-hover:translate-x-0.5 ${card.btnClass}`}
                      aria-hidden
                    >
                      →
                    </span>
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        <div className="ucak-anim-trust mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 backdrop-blur"
              >
                <Icon className={`size-5 shrink-0 ${item.color}`} strokeWidth={2} />
                <span className="text-xs font-semibold leading-snug text-slate-600 sm:text-sm">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

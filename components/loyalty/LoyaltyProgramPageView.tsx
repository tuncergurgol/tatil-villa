import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  Gift,
  Sparkles,
  UserPlus,
  Wallet,
} from "lucide-react";
import {
  LOYALTY_RULES,
  LOYALTY_TIER_META,
  LOYALTY_TIER_ORDER,
} from "@/lib/loyalty-config";

const TIER_STYLES: Record<
  (typeof LOYALTY_TIER_ORDER)[number],
  { ring: string; bg: string; badge: string }
> = {
  BRONZE: {
    ring: "border-amber-200",
    bg: "from-amber-50 to-orange-50",
    badge: "bg-amber-100 text-amber-900",
  },
  SILVER: {
    ring: "border-slate-300",
    bg: "from-slate-50 to-zinc-100",
    badge: "bg-slate-200 text-slate-800",
  },
  GOLD: {
    ring: "border-yellow-300",
    bg: "from-yellow-50 to-amber-50",
    badge: "bg-yellow-100 text-yellow-900",
  },
  PLATINUM: {
    ring: "border-teal-300",
    bg: "from-teal-50 to-emerald-50",
    badge: "bg-teal-100 text-teal-900",
  },
};

const STEPS = [
  {
    icon: UserPlus,
    title: "Ücretsiz üye olun",
    text: "Telefon veya e-posta ile birkaç dakikada üyelik oluşturun. Bronz sınıfıyla hemen avantaj kazanmaya başlarsınız.",
  },
  {
    icon: Sparkles,
    title: "Konaklayın, sınıfınız yükselsin",
    text: "Her tamamlanan konaklama üyelik sınıfınızı bir üst seviyeye taşır. Sınıfınız hesabınızda görünür.",
  },
  {
    icon: BadgePercent,
    title: "Rezervasyonda indirim kazanın",
    text: "Rezervasyon talebi verirken üye girişi yapın; sınıfınıza göre yalnızca konaklama bedeline otomatik indirim uygulanır.",
  },
  {
    icon: Gift,
    title: "Arkadaşınızı davet edin",
    text: "Davet kodunuzla gelen misafirler hoş geldin hediyesi alır; siz de konaklama tamamlandığında ödül kazanırsınız.",
  },
] as const;

const FAQ_ITEMS = [
  {
    question: "İndirim hangi tutara uygulanır?",
    answer:
      "Sadakat sınıfı indirimi yalnızca konaklama bedeline uygulanır. Temizlik, ek hizmet ve depozito kalemleri indirim dışındadır.",
  },
  {
    question: "İndirimi nasıl kullanırım?",
    answer:
      "Villa detayında tarih ve misafir seçip rezervasyon talebi oluştururken üye girişi yapmanız yeterlidir. Uygun indirim otomatik hesaplanır; ayrıca kod girmenize gerek yoktur.",
  },
  {
    question: "Üyelik sınıfım nasıl belirlenir?",
    answer:
      "Tamamlanan konaklama sayınıza göre sınıfınız güncellenir: 0 konaklama Bronz, 1 Silver, 2 Gold, 3 ve üzeri Platin.",
  },
  {
    question: "Sadakat çeki ne zaman tanımlanır?",
    answer:
      "Konaklamanız tamamlandıktan sonra seviyenize uygun sadakat çeki hesabınıza tanımlanır. Çekler belirli süre geçerlidir ve kullanım koşullarına tabidir.",
  },
  {
    question: "Davet programı nasıl çalışır?",
    answer: `Davet ettiğiniz kişi üye olup ilk rezervasyonunu tamamladığında siz ${LOYALTY_RULES.referralRewardAmount.toLocaleString("tr-TR")} TL ödül kazanırsınız. Davet edilen misafir ${LOYALTY_RULES.welcomeReferralDiscount.toLocaleString("tr-TR")} TL hoş geldin avantajıyla başlar.`,
  },
] as const;

function formatStayRequirement(stays: number) {
  if (stays <= 0) return "Yeni üyelik";
  if (stays === 1) return "1 tamamlanan konaklama";
  if (stays === 2) return "2 tamamlanan konaklama";
  return "3+ tamamlanan konaklama";
}

export default function LoyaltyProgramPageView({
  brandName = "Tatildeyiz",
}: {
  brandName?: string;
}) {
  const exampleAccommodation = 33000;
  const platinumDiscount = Math.round(
    (exampleAccommodation * LOYALTY_TIER_META.PLATINUM.voucherPercent) / 100
  );

  return (
    <main className="bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-800 px-4 py-16 text-white sm:px-6 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 left-10 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-5xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-teal-50">
            <Sparkles className="h-3.5 w-3.5" />
            {brandName} Sadakat Programı
          </p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Konakladıkça kazanın, her rezervasyonda avantajlı kalın
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-teal-50 sm:text-lg">
            Ücretsiz üye olun; tamamladığınız konaklamalarla sınıfınız yükselsin,
            rezervasyon talebinde konaklama bedeline{" "}
            <strong>%7&apos;ye varan indirim</strong> kazanın.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/uye"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-teal-800 transition hover:bg-teal-50"
            >
              Ücretsiz Üye Ol
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/villalar"
              className="inline-flex items-center gap-2 rounded-full border border-white/35 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Villaları Keşfet
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 grid max-w-5xl gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {LOYALTY_TIER_ORDER.map((tier) => {
          const meta = LOYALTY_TIER_META[tier];
          const style = TIER_STYLES[tier];
          return (
            <div
              key={tier}
              className={`rounded-2xl border bg-gradient-to-br p-4 shadow-sm ${style.ring} ${style.bg}`}
            >
              <p className="text-2xl">{meta.emoji}</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{meta.label}</p>
              <p
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${style.badge}`}
              >
                %{meta.voucherPercent} indirim
              </p>
            </div>
          );
        })}
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Nasıl çalışır?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Karmaşık puan tabloları yok. Üye olun, konaklayın, bir sonraki
            rezervasyonunuzda indiriminizi görün.
          </p>
        </div>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-teal-700" />
                      <h3 className="text-base font-bold text-slate-900">
                        {step.title}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {step.text}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Üyelik sınıfları
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Tamamlanan konaklama sayınız sınıfınızı belirler. Her sınıf,
            bir sonraki rezervasyon talebinde konaklama bedeline uygulanacak
            indirim oranını artırır.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LOYALTY_TIER_ORDER.map((tier) => {
              const meta = LOYALTY_TIER_META[tier];
              const style = TIER_STYLES[tier];
              return (
                <article
                  key={tier}
                  className={`rounded-2xl border bg-gradient-to-br p-5 ${style.ring} ${style.bg}`}
                >
                  <p className="text-3xl">{meta.emoji}</p>
                  <h3 className="mt-3 text-xl font-bold text-slate-900">
                    {meta.label}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{meta.description}</p>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500">Gereksinim</dt>
                      <dd className="font-semibold text-slate-800">
                        {formatStayRequirement(meta.requiredStays)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500">İndirim oranı</dt>
                      <dd className="font-bold text-teal-800">
                        %{meta.voucherPercent}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Rezervasyonda indirim nasıl uygulanır?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              Villa seçip tarihlerinizi belirledikten sonra{" "}
              <strong>Ön Rezervasyon Talebi Gönder</strong> adımında üye
              girişi yapın. Sistem sınıfınıza uygun indirimi otomatik hesaplar;
              indirimli rezervasyon tutarını ekranda görürsünüz.
            </p>
            <ul className="mt-5 space-y-3 text-sm text-slate-700">
              <li className="flex gap-2">
                <BadgePercent className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                İndirim yalnızca konaklama bedeline uygulanır.
              </li>
              <li className="flex gap-2">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                Kupon bakiyesi ve sadakat çekleri varsa en avantajlı seçenek
                otomatik uygulanır.
              </li>
              <li className="flex gap-2">
                <Gift className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                Üye olmadan da talep verebilirsiniz; indirim için giriş
                yapmanız gerekir.
              </li>
            </ul>
            <Link
              href="/uye"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-800"
            >
              Üye Girişi Yap
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
              Örnek hesaplama
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Platin üye · 33.000 TL konaklama + 750 TL temizlik
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Konaklama</dt>
                <dd className="font-medium text-slate-900">33.000 TL</dd>
              </div>
              <div className="flex justify-between gap-3 text-emerald-700">
                <dt>Platin indirimi (%7)</dt>
                <dd className="font-semibold">−{platinumDiscount.toLocaleString("tr-TR")} TL</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Temizlik bedeli</dt>
                <dd className="font-medium text-slate-900">750 TL</dd>
              </div>
            </dl>
            <div className="mt-4 rounded-xl border border-teal-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                İndirimli rezervasyon tutarı
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {(exampleAccommodation - platinumDiscount + 750).toLocaleString("tr-TR")}{" "}
                TL
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-xl font-bold text-slate-900">Davet programı</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Üye hesabınızdaki davet kodunu paylaşın. Davet ettiğiniz kişi üye
              olup ilk rezervasyonunu tamamladığında siz{" "}
              <strong>
                {LOYALTY_RULES.referralRewardAmount.toLocaleString("tr-TR")} TL
              </strong>{" "}
              kupon bakiyesi kazanırsınız.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Davet edilen misafir{" "}
              <strong>
                {LOYALTY_RULES.welcomeReferralDiscount.toLocaleString("tr-TR")} TL
              </strong>{" "}
              hoş geldin avantajıyla başlar.
            </p>
            <Link
              href="/uye/hesabim/davet"
              className="mt-5 inline-flex text-sm font-bold text-amber-900 hover:underline"
            >
              Davet koduma git →
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-bold text-slate-900">Bilmeniz gerekenler</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
              <li>
                Sadakat çekleri konaklama tamamlandıktan sonra tanımlanır; geçerlilik
                süresi <strong>{LOYALTY_RULES.voucherValidityDays} gün</strong>.
              </li>
              <li>
                Çek kullanımında konaklama tutarı, çek tutarının en az{" "}
                {LOYALTY_RULES.minBookingMultiplier} katı olmalıdır.
              </li>
              <li>
                Uzun süre konaklama olmazsa sınıfınız{" "}
                {LOYALTY_RULES.tierDecayMonths} ay sonra düşürülebilir; minimum
                sınıf {LOYALTY_TIER_META[LOYALTY_RULES.minTierAfterDecay].label}{" "}
                olarak korunur.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-slate-900">
          Sık sorulan sorular
        </h2>
        <div className="mt-8 space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.question}
              className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <summary className="cursor-pointer list-none font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
                {item.question}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-teal-800 to-emerald-700 px-6 py-10 text-center text-white sm:px-10">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Sadakat avantajınızı bir sonraki tatilde kullanın
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-teal-50 sm:text-base">
            Ücretsiz üye olun, villanızı seçin ve indirimli rezervasyon talebinizi
            birkaç dakikada oluşturun.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/uye"
              className="rounded-full bg-white px-6 py-3 text-sm font-bold text-teal-800 hover:bg-teal-50"
            >
              Hemen Üye Ol
            </Link>
            <Link
              href="/villalar"
              className="rounded-full border border-white/35 px-6 py-3 text-sm font-bold text-white hover:bg-white/10"
            >
              Villalara Git
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import {
  CreditCard,
  Lock,
  CalendarClock,
  Landmark,
  ArrowRight,
} from "lucide-react";
import CampaignLandingHero from "@/components/campaigns/CampaignLandingHero";

const CARD_PROGRAMS = [
  { name: "Bonus", bank: "Garanti BBVA" },
  { name: "World", bank: "Yapı Kredi" },
  { name: "Axess", bank: "Akbank" },
  { name: "Maximum", bank: "İş Bankası" },
  { name: "Paraf", bank: "Halkbank" },
  { name: "Bankkart", bank: "Ziraat Bankası" },
  { name: "Sağlam Kart", bank: "VakıfBank" },
  { name: "Advantage", bank: "HSBC" },
  { name: "Wings", bank: "ING" },
] as const;

const HIGHLIGHTS = [
  {
    icon: CreditCard,
    title: "Tüm kredi kartlarına 12 taksit",
    text: "Anlaşmalı kart programlarında 12 aya varan taksit ile villa rezervasyonunuzu bütçenize yayın.",
  },
  {
    icon: Landmark,
    title: "Banka vade seçenekleri",
    text: "Taksit sayısı ve vade farkı, kartınızın bankasına göre ödeme ekranında güncel olarak gösterilir.",
  },
  {
    icon: Lock,
    title: "Güvenli sanal POS",
    text: "Kart bilgileriniz SSL korumalı ödeme altyapısı üzerinden işlenir; sitemizde saklanmaz.",
  },
  {
    icon: CalendarClock,
    title: "Erken plan, rahat ödeme",
    text: "Popüler tarihleri şimdiden ayırtın; yüksek peşin yükü olmadan tatilinizi planlayın.",
  },
] as const;

export default function InstallmentCampaignPageView() {
  return (
    <main className="bg-slate-50">
      <CampaignLandingHero
        image="/campaigns/kampanya-12-taksit.jpg"
        imageAlt="Tüm kredi kartlarına 12 taksit imkanı"
        eyebrow="Ödeme kolaylığı"
        title="Tüm kredi kartlarına 12 taksit imkanı"
        subtitle="Hayalinizdeki villa tatilini ertelemeyin. Tüm kredi kartlarına 12 aya varan taksit seçenekleriyle rezervasyonunuzu bütçenize uygun şekilde tamamlayın."
        actions={
          <>
            <Link
              href="/villalar"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-teal-800 transition hover:bg-teal-50"
            >
              Villaları İncele
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/sizi-arayalim"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Sizi Arayalım
            </Link>
          </>
        }
      />

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-4 sm:grid-cols-2">
          {HIGHLIGHTS.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <Icon className="h-6 w-6 text-teal-700" />
                <h2 className="mt-3 text-lg font-bold text-slate-900">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {item.text}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900">
            Taksit imkanı sunan kart programları
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Aşağıdaki kart programlarında 12 aya varan taksit seçenekleri
            sunulabilir. Güncel vade ve komisyon, ödeme adımında kartınıza göre
            hesaplanır.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CARD_PROGRAMS.map((card) => (
              <li
                key={card.name}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <p className="font-semibold text-slate-900">{card.name}</p>
                <p className="text-sm text-slate-500">{card.bank}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 rounded-2xl border border-teal-100 bg-teal-50/70 p-6">
          <h2 className="text-lg font-bold text-teal-950">Nasıl çalışır?</h2>
          <ol className="mt-4 space-y-2 text-sm leading-relaxed text-teal-950/80">
            <li>1. Size uygun villayı seçin ve tarihlerinizi belirleyin.</li>
            <li>2. Rezervasyon talebinde kredi kartı ile ödemeyi tercih edin.</li>
            <li>
              3. Ödeme ekranında bankanıza uygun taksit seçeneklerini görün ve
              işlemi tamamlayın.
            </li>
          </ol>
          <p className="mt-4 text-xs leading-relaxed text-teal-900/70">
            Taksit sayıları, vade farkı ve kampanya koşulları bankalar ile kart
            programlarına göre değişebilir. Ödeme sırasında gösterilen seçenekler
            geçerlidir.
          </p>
        </div>
      </section>
    </main>
  );
}

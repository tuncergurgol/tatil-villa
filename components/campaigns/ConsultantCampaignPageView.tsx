import Link from "next/link";
import {
  ArrowRight,
  Headphones,
  MapPinned,
  MessageCircle,
  ShieldCheck,
  Sunrise,
} from "lucide-react";
import CampaignLandingHero from "@/components/campaigns/CampaignLandingHero";

const SUPPORT_POINTS = [
  {
    icon: Headphones,
    title: "Kişisel tatil danışmanı",
    text: "Rezervasyonunuz onaylandığı andan itibaren size özel bir danışman atanır. Sorularınız tek bir kişide toplanır.",
  },
  {
    icon: Sunrise,
    title: "Giriş gününden çıkışa kadar",
    text: "Transfer, market, aktivite, villa içi eksik veya acil durum… Tatiliniz bitene kadar yanınızdayız.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp ile hızlı iletişim",
    text: "Mesai saati beklemeden danışmanınıza yazın. Konaklama süresince ulaşılabilir destek sunuyoruz.",
  },
  {
    icon: MapPinned,
    title: "Yerel bilgi ve yönlendirme",
    text: "Bölge restoranları, plajlar, market ve gezi önerilerini sizin planınıza göre paylaşırız.",
  },
  {
    icon: ShieldCheck,
    title: "Sorun olursa müdahale",
    text: "Villa, temizlik veya teknik bir aksaklıkta danışmanınız süreci takip eder; sizi yalnız bırakmayız.",
  },
] as const;

export default function ConsultantCampaignPageView({
  whatsappHref,
  phoneLabel,
}: {
  whatsappHref: string;
  phoneLabel: string;
}) {
  return (
    <main className="bg-slate-50">
      <CampaignLandingHero
        image="/campaigns/kampanya-tatil-danismani.jpg"
        imageAlt="Tatil danışmanı desteği"
        eyebrow="Sürekli destek"
        title="Tatilinizin sonuna kadar yanınızdayız"
        subtitle="Rezervasyondan villadan çıkışa kadar kişisel tatil danışmanı ile sürekli iletişim. Sorun çözülür, planınız rahat akar."
        actions={
          <>
            <Link
              href="/sizi-arayalim"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-teal-800 transition hover:bg-teal-50"
            >
              Danışman Sizi Arasın
              <ArrowRight className="h-4 w-4" />
            </Link>
            {whatsappHref !== "#" ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                WhatsApp: {phoneLabel}
              </a>
            ) : null}
          </>
        }
      />

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Sürekli tatil danışmanı desteği
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Tatil yalnızca villayı seçmekle bitmez. Giriş bilgileri, yol tarifi,
          villa içi ihtiyaçlar ve dönüş günü teslimi dahil tüm süreçte size özel
          bir danışmanla ilerlersiniz.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {SUPPORT_POINTS.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <Icon className="h-6 w-6 text-teal-700" />
                <h3 className="mt-3 text-lg font-bold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {item.text}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

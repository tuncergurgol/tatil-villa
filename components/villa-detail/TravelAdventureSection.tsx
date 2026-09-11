import Link from "next/link";
import { Building2, Bus, Car, Map, Plane, Ship } from "lucide-react";
import { getPublishedServicesForHost } from "@/lib/queries/agency-sites";
import { getRequestHostname } from "@/lib/public-site-profile";

const SERVICES = [
  {
    key: "otel",
    href: "/otel",
    label: "Otel",
    description: "Otelz ile konforlu konaklama",
    icon: Building2,
  },
  {
    key: "arac",
    href: "/arac-kiralama",
    label: "Araç Kiralama",
    description: "Tatilinize özel araç seçenekleri",
    icon: Car,
  },
  {
    key: "transfer",
    href: "/vip-transfer",
    label: "VIP Transfer",
    description: "Havalimanı ve şehir transferi",
    icon: Bus,
  },
  {
    key: "feribot",
    href: "/feribot",
    label: "Feribot",
    description: "Ada ve liman geçişleri",
    icon: Ship,
  },
  {
    key: "gunubirlik",
    href: "/tur/liste",
    label: "Tur & Aktivite",
    description: "Yerel deneyimler ve turlar",
    icon: Map,
  },
  {
    key: "ucak-otobus",
    href: "/bilet/ara",
    label: "Uçak / Otobüs",
    description: "Ulaşım planınızı tamamlayın",
    icon: Plane,
  },
] as const;

export function TravelAdventureSectionView({
  publishedServices,
}: {
  publishedServices?: string[] | null;
}) {
  const visible = publishedServices
    ? SERVICES.filter((service) => publishedServices.includes(service.key))
    : SERVICES;

  if (visible.length === 0) return null;

  const colsClass =
    visible.length >= 6
      ? "xl:grid-cols-6"
      : visible.length === 5
        ? "xl:grid-cols-5"
        : visible.length === 4
          ? "xl:grid-cols-4"
          : visible.length === 3
            ? "xl:grid-cols-3"
            : "xl:grid-cols-2";

  return (
    <section className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-sky-50 px-5 py-8 sm:px-8">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Seyahat Maceranız burada başlıyor
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
          Villa konaklamanıza ek olarak otel, transfer, araç kiralama ve ulaşım
          hizmetlerimizle tatilinizi uçtan uca planlayın.
        </p>
      </div>

      <div
        className={`mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${colsClass}`}
      >
        {visible.map((service) => {
          const Icon = service.icon;
          return (
            <Link
              key={service.href}
              href={service.href}
              className="group flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 transition group-hover:bg-teal-600 group-hover:text-white">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900">
                  {service.label}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                  {service.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Host’a göre Acente Siteleri yayın ayarını okuyarak kartları filtreler. */
export default async function TravelAdventureSection() {
  const publishedServices = await getPublishedServicesForHost(
    await getRequestHostname()
  );
  return <TravelAdventureSectionView publishedServices={publishedServices} />;
}

import Link from "next/link";
import { Bus, Car, Map, Plane, Ship } from "lucide-react";

const SERVICES = [
  {
    href: "/arac-kiralama",
    label: "Araç Kiralama",
    description: "Tatilinize özel araç seçenekleri",
    icon: Car,
  },
  {
    href: "/vip-transfer",
    label: "VIP Transfer",
    description: "Havalimanı ve şehir transferi",
    icon: Bus,
  },
  {
    href: "/feribot",
    label: "Feribot",
    description: "Ada ve liman geçişleri",
    icon: Ship,
  },
  {
    href: "/tur/liste",
    label: "Tur & Aktivite",
    description: "Yerel deneyimler ve turlar",
    icon: Map,
  },
  {
    href: "/ucak-otobus",
    label: "Uçak / Otobüs",
    description: "Ulaşım planınızı tamamlayın",
    icon: Plane,
  },
] as const;

export default function TravelAdventureSection() {
  return (
    <section className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-sky-50 px-5 py-8 sm:px-8">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Seyahat Maceranız burada başlıyor
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
          Villa konaklamanıza ek olarak transfer, araç kiralama ve ulaşım
          hizmetlerimizle tatilinizi uçtan uca planlayın.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {SERVICES.map((service) => {
          const Icon = service.icon;
          return (
            <Link
              key={service.href}
              href={service.href}
              className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-4 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
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

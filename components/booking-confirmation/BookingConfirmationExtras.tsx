import Link from "next/link";
import { ArrowRight, Bus, Car, Plane } from "lucide-react";

const SERVICES = [
  {
    href: "/arac-kiralama",
    title: "Araç Kiralama",
    description:
      "Villanızın çevresini kendi temponuzda keşfedin. Uygun araçları hemen karşılaştırabilirsiniz.",
    cta: "Araçlara Göz At",
    icon: Car,
    accent: "from-teal-50 to-emerald-50",
    iconBg: "bg-teal-100 text-teal-700 group-hover:bg-teal-600 group-hover:text-white",
  },
  {
    href: "/bilet/ara",
    title: "Otobüs ve Uçak Bileti",
    description:
      "Gidiş-dönüş yolculuğunuzu şimdiden planlayın; koltuklarınızı kolayca ayıralım.",
    cta: "Bilet Ara",
    icon: Plane,
    accent: "from-sky-50 to-blue-50",
    iconBg: "bg-sky-100 text-sky-700 group-hover:bg-sky-600 group-hover:text-white",
  },
  {
    href: "/vip-transfer",
    title: "Transfer Talebi",
    description:
      "Havalimanı veya otogardan villanıza konforlu transfer için talebinizi iletin.",
    cta: "Transfer Talep Et",
    icon: Bus,
    accent: "from-amber-50 to-orange-50",
    iconBg: "bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white",
  },
] as const;

export default function BookingConfirmationExtras() {
  return (
    <section
      aria-labelledby="confirmation-extras-heading"
      className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-100 bg-white p-6 shadow-lg sm:p-8"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
          Tatiliniz için hazırız
        </p>
        <h2
          id="confirmation-extras-heading"
          className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
        >
          Yolculuğunuzu da birlikte tamamlayalım
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
          Villa rezervasyonunuz onaylandı. Dilerseniz araç, bilet veya transfer
          ile tatilinizi baştan sona zahmetsiz hale getirebilirsiniz — size en
          uygun olanı seçmeniz yeterli.
        </p>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {SERVICES.map((service) => {
          const Icon = service.icon;
          return (
            <Link
              key={service.href}
              href={service.href}
              className={`group flex h-full flex-col rounded-2xl border border-slate-100 bg-gradient-to-br ${service.accent} p-5 transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md`}
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-xl transition ${service.iconBg}`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.85} />
              </span>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                {service.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                {service.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 transition group-hover:gap-2.5">
                {service.cta}
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

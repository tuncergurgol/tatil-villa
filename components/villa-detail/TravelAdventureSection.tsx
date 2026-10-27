import { getTranslations } from "next-intl/server";
import { Building2, Bus, Car, Map, Plane, Ship } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { getPublishedServicesForHost } from "@/lib/queries/agency-sites";
import { usesTesisListingCopy } from "@/lib/public-listing-copy";
import {
  getRequestHostname,
  getRequestPublicSiteKey,
} from "@/lib/public-site-profile";

const SERVICES = [
  {
    key: "otel",
    href: "/otel",
    labelKey: "tabHotel" as const,
    descKey: "hotelDesc" as const,
    icon: Building2,
  },
  {
    key: "arac",
    href: "/arac-kiralama",
    labelKey: "tabCarRental" as const,
    descKey: "carRentalDesc" as const,
    icon: Car,
  },
  {
    key: "transfer",
    href: "/vip-transfer",
    labelKey: "vipTransfer" as const,
    descKey: "transferDesc" as const,
    icon: Bus,
  },
  {
    key: "feribot",
    href: "/feribot",
    labelKey: "tabFerry" as const,
    descKey: "ferryDesc" as const,
    icon: Ship,
  },
  {
    key: "gunubirlik",
    href: "/tur/liste",
    labelKey: "tourActivity" as const,
    descKey: "tourDesc" as const,
    icon: Map,
  },
  {
    key: "ucak-otobus",
    href: "/bilet/ara",
    labelKey: "tabFlightBus" as const,
    descKey: "flightDesc" as const,
    icon: Plane,
  },
] as const;

export async function TravelAdventureSectionView({
  publishedServices,
  useTesisCopy = false,
}: {
  publishedServices?: string[] | null;
  useTesisCopy?: boolean;
}) {
  const tHome = await getTranslations("home");
  const tSearch = await getTranslations("search");
  const tServices = await getTranslations("services");
  const travelAddon = useTesisCopy
    ? tHome("travelAddonTesis")
    : tHome("travelAddonVilla");

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
          {tHome("travelAdventureTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
          {travelAddon} {tHome("travelAdventureSuffix")}
        </p>
      </div>

      <div
        className={`mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${colsClass}`}
      >
        {visible.map((service) => {
          const Icon = service.icon;
          const label =
            service.labelKey === "vipTransfer" ||
            service.labelKey === "tourActivity"
              ? tServices(service.labelKey)
              : tSearch(service.labelKey);
          const description = tServices(service.descKey);
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
                  {label}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                  {description}
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
  const [hostname, siteKey] = await Promise.all([
    getRequestHostname(),
    getRequestPublicSiteKey(),
  ]);
  const publishedServices = await getPublishedServicesForHost(hostname);
  return (
    <TravelAdventureSectionView
      publishedServices={publishedServices}
      useTesisCopy={usesTesisListingCopy(siteKey)}
    />
  );
}

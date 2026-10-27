import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import CarRentalPublicPage from "@/components/car-rental/CarRentalPublicPage";
import TravelAdventureSection from "@/components/villa-detail/TravelAdventureSection";
import {
  localizeCarRentalCriteria,
  localizeCarRentalDriverAges,
  localizeCarRentalSettings,
} from "@/lib/i18n/car-rental-en";
import { getCarRentalPublicPageData } from "@/lib/queries/car-rental";
import { getYolcu360Settings } from "@/lib/yolcu360/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, tChrome] = await Promise.all([
    getLocale(),
    getTranslations("chrome"),
  ]);
  return {
    title: tChrome("carRental"),
    description:
      locale === "tr"
        ? "Türkiye genelinde havalimanı teslim noktaları ile araç kiralama seçenekleri."
        : "Car rental options with airport pick-up points across Turkey.",
  };
}

export default async function AracKiralamaPage() {
  const [locale, data, yolcu360] = await Promise.all([
    getLocale(),
    getCarRentalPublicPageData(),
    getYolcu360Settings(),
  ]);
  const yolcu360Enabled = yolcu360.enabled && yolcu360.publicEnabled;
  const localized = {
    ...data,
    settings: localizeCarRentalSettings(data.settings, locale),
    criteria: localizeCarRentalCriteria(data.criteria, locale),
    driverAgeOptions: localizeCarRentalDriverAges(
      data.driverAgeOptions,
      locale
    ),
  };

  return (
    <>
      <CarRentalPublicPage {...localized} yolcu360Enabled={yolcu360Enabled} />
      <section
        id="seyahat-macerasi"
        className="border-t border-slate-200 bg-white py-12 sm:py-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <TravelAdventureSection />
        </div>
      </section>
    </>
  );
}

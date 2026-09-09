import type { Metadata } from "next";
import CarRentalPublicPage from "@/components/car-rental/CarRentalPublicPage";
import TravelAdventureSection from "@/components/villa-detail/TravelAdventureSection";
import { getCarRentalPublicPageData } from "@/lib/queries/car-rental";
import { getYolcu360Settings } from "@/lib/yolcu360/settings";

export const metadata: Metadata = {
  title: "Araç Kiralama",
  description:
    "Türkiye genelinde havalimanı teslim noktaları ile araç kiralama seçenekleri.",
};

export const dynamic = "force-dynamic";

export default async function AracKiralamaPage() {
  const [data, yolcu360] = await Promise.all([
    getCarRentalPublicPageData(),
    getYolcu360Settings(),
  ]);
  const yolcu360Enabled = yolcu360.enabled && yolcu360.publicEnabled;
  return (
    <>
      <CarRentalPublicPage {...data} yolcu360Enabled={yolcu360Enabled} />
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

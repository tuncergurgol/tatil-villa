import type { Metadata } from "next";
import CarRentalPublicPage from "@/components/car-rental/CarRentalPublicPage";
import { getCarRentalPublicPageData } from "@/lib/queries/car-rental";

export const metadata: Metadata = {
  title: "Araç Kiralama",
  description:
    "Türkiye genelinde havalimanı teslim noktaları ile araç kiralama seçenekleri.",
};

export const dynamic = "force-dynamic";

export default async function AracKiralamaPage() {
  const data = await getCarRentalPublicPageData();
  return <CarRentalPublicPage {...data} />;
}

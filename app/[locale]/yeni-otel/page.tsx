import type { Metadata } from "next";
import { notFound } from "next/navigation";
import YeniOtelPage from "@/components/yeni-otel/YeniOtelPage";
import { KIVANC_TATIL_KOYU } from "@/lib/yeni-otel/catalog";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yeni Otel | Kıvanç Tatil Köyü",
  description:
    "Kıvanç Tatil Köyü Ölüdeniz odalarını tarih, kişi ve konsept seçerek inceleyin. Rezervasyon talebi bırakın.",
};

export default async function YeniOtelRoute() {
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  if (site.key !== "tatildeyiz") notFound();

  return <YeniOtelPage hotel={KIVANC_TATIL_KOYU} />;
}

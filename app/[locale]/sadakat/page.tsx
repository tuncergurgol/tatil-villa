import type { Metadata } from "next";
import LoyaltyProgramPageView from "@/components/loyalty/LoyaltyProgramPageView";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { siteConfig } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sadakat Programı",
  description:
    "Ücretsiz üye olun, konakladıkça sınıfınız yükselsin. Rezervasyon talebinde konaklama bedeline %7'ye varan indirim kazanın.",
};

export default async function SadakatProgramPage() {
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const brandName = site.brandName?.trim() || company.brandName?.trim() || siteConfig.name;

  return <LoyaltyProgramPageView brandName={brandName} />;
}

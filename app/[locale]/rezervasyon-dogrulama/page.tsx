import type { Metadata } from "next";
import BookingGuestLoginPageView from "@/components/booking-guest-login/BookingGuestLoginPageView";
import { siteConfig } from "@/lib/data";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  return {
    title: `Rezervasyon Doğrulama — ${site.brandName}`,
    description:
      "Rezervasyonunuzu e-posta ve rezervasyon kodu ile doğrulayın; WhatsApp doğrulama sonrası giriş bilgilerinizi görüntüleyin.",
    robots: { index: false, follow: false },
  };
}

export default async function RezervasyonDogrulamaPage() {
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const phone = company.phone?.trim() || siteConfig.phone;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
      <BookingGuestLoginPageView
        brandName={site.brandName}
        logoUrl={site.logoUrl || undefined}
        phone={phone}
      />
    </div>
  );
}

import MobileBottomNavigation from "@/components/MobileBottomNavigation";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { siteConfig } from "@/lib/data";

export default async function SiteChromeMobileNav() {
  const company = await getCompanySettings();
  const phone = company.phone?.trim() || siteConfig.phone;

  return (
    <MobileBottomNavigation
      phone={phone}
      whatsapp={company.whatsapp?.trim() || phone}
    />
  );
}

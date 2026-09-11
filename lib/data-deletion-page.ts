import "server-only";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";

export async function getDataDeletionPageContent() {
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);

  return {
    brand: site.brandName || company.brandName,
    companyTitle: company.companyTitle || company.agencyName,
    email: company.email || "info@tatilvillacisi.com.tr",
    domain: site.domain || company.domain,
  };
}

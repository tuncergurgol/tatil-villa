import Header from "@/components/Header";
import { getSiteMenuItemsForPublic } from "@/lib/queries/site-menus";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { siteConfig } from "@/lib/data";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  canonicalOriginFromDomain,
} from "@/lib/search-discovery";
import { buildCompanySocialLinks } from "@/lib/social-links";

const defaultHeaderLinks = [
  { href: "/villalar", label: "Villalar" },
  { href: "/villalar?filter=deal", label: "Fırsatlar" },
  { href: "/#bolgeler", label: "Bölgeler" },
  { href: "/#kampanyalar", label: "Kampanyalar" },
  { href: "/sadakat", label: "Sadakat Programı" },
];

export default async function SiteChromeHeader() {
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const headerMenu = await getSiteMenuItemsForPublic("header");

  const headerLinks =
    headerMenu.length > 0
      ? headerMenu.map((item) => ({ href: item.href, label: item.label }))
      : defaultHeaderLinks;

  const brandName = site.brandName?.trim() || siteConfig.name;
  const phone = company.phone?.trim() || siteConfig.phone;
  const origin = canonicalOriginFromDomain(site.domain);
  const organizationJsonLd = buildOrganizationJsonLd({
    origin,
    brandName,
    companyTitle: company.companyTitle,
    description: site.seoDescription,
    logoUrl: site.logoUrl,
    email: company.email,
    phone,
    address: company.address,
    sameAs: buildCompanySocialLinks(company).map((link) => link.href),
  });
  const websiteJsonLd = buildWebSiteJsonLd({
    origin,
    brandName,
    description: site.seoDescription,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <Header
        navLinks={headerLinks}
        brandName={brandName}
        logoUrl={site.logoUrl}
        useDefaultLogo={site.useDefaultLogo}
        siteKey={site.key}
        agencyName={company.agencyName}
        tursabNo={company.tursabNo}
        phone={phone}
      />
    </>
  );
}

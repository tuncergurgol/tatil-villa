/**
 * 4. public site (opsiyonel) — domain belli olunca .env ile açılır.
 *
 * PUBLIC_SITE_4_KEY=ornek-marka
 * PUBLIC_SITE_4_DOMAIN=www.ornek.com
 * PUBLIC_SITE_4_BRAND=Örnek Marka
 * PUBLIC_SITE_4_HERO_TITLE=...
 * PUBLIC_SITE_4_SEO_TITLE=...
 * PUBLIC_SITE_4_SEO_DESCRIPTION=...
 *
 * Marka görselleri: public/brands/{key}/logo.png, favicon.png, og-image.png, hero.png
 */
export type OptionalSite4Config = {
  key: string;
  domain: string;
  brandName: string;
  heroTitle: string;
  seoTitle: string;
  seoDescription: string;
  hosts: string[];
};

function clean(value: string | undefined) {
  return (value ?? "").trim();
}

export function getOptionalSite4Config(): OptionalSite4Config | null {
  const key = clean(process.env.PUBLIC_SITE_4_KEY);
  const domain = clean(process.env.PUBLIC_SITE_4_DOMAIN)
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
  const brandName = clean(process.env.PUBLIC_SITE_4_BRAND);
  if (!key || !domain || !brandName) return null;
  if (!/^[a-z0-9-]+$/i.test(key)) return null;

  const apex = domain.replace(/^www\./i, "");
  const www = domain.startsWith("www.") ? domain : `www.${apex}`;

  return {
    key,
    domain: www,
    brandName,
    heroTitle:
      clean(process.env.PUBLIC_SITE_4_HERO_TITLE) ||
      `${brandName} ile Hayalinizdeki Tatil`,
    seoTitle:
      clean(process.env.PUBLIC_SITE_4_SEO_TITLE) ||
      `${brandName} - Kiralık Villa Tatili`,
    seoDescription:
      clean(process.env.PUBLIC_SITE_4_SEO_DESCRIPTION) ||
      `${brandName} ile özel havuzlu kiralık villaları keşfedin.`,
    hosts: [www, apex],
  };
}

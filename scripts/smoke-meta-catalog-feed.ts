/**
 * Meta / WhatsApp katalog XML beslemesi smoke testi.
 * Çalıştır: npx tsx scripts/smoke-meta-catalog-feed.ts
 */
import { buildMetaCatalogFeedXml } from "../lib/meta-catalog-feed";
import { getCompanySettings } from "../lib/queries/company-settings";
import { PUBLIC_SITE_META } from "../lib/public-site-keys";

function assert(condition: boolean, label: string) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`ok — ${label}`);
}

async function main() {
  const settings = await getCompanySettings();
  const meta = PUBLIC_SITE_META.tatildeyiz;
  const xml = await buildMetaCatalogFeedXml({
    key: "tatildeyiz",
    domain: settings.domain || meta.domain,
    brandName: settings.brandName || meta.label,
    logoUrl: settings.logoUrl,
    faviconUrl: settings.faviconUrl,
    ogImageUrl: settings.ogImageUrl,
    seoTitle: settings.seoTitle,
    seoDescription: settings.seoDescription,
    heroTitle: "",
    heroImageUrl: "",
    useDefaultLogo: true,
  });

  assert(xml.startsWith("<?xml"), "XML başlığı var");
  assert(xml.includes("<g:id>"), "ürün id alanı var");
  assert(xml.includes("<g:title>"), "title alanı var");
  assert(xml.includes("<g:description>"), "description alanı var");
  assert(xml.includes("<g:image_link>"), "image_link alanı var");
  assert(xml.includes("<g:link>"), "link alanı var");
  assert(xml.includes("<g:price>"), "price alanı var");
  assert(xml.includes("<g:availability>in stock</g:availability>"), "availability alanı var");
  assert(xml.includes(" TRY</g:price>"), "TRY para birimi var");

  const itemCount = (xml.match(/<item>/g) ?? []).length;
  assert(itemCount > 0, `en az bir villa (${itemCount})`);

  console.log(`\n${itemCount} villa ile katalog beslemesi hazır.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

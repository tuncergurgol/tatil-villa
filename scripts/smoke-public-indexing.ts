import assert from "node:assert/strict";
import {
  isForeignLocalePath,
  isIndexableLocale,
  isIndexableVillaSearch,
  shouldNoindexPublicUrl,
  villaSearchCanonicalPath,
} from "../lib/public-indexing";
import { wwwHostnameForPublicHost } from "../lib/i18n/middleware-host";
import { LEGACY_PUBLIC_REDIRECTS, legacyBrokenPublicPathDestination, legacyTesisRedirectDestination } from "../lib/legacy-redirects";

assert.equal(isIndexableLocale("tr"), true);
assert.equal(isIndexableLocale("en"), false);
assert.equal(isForeignLocalePath("/en/villa-divan"), true);
assert.equal(isForeignLocalePath("/el/villa-prime-1"), true);
assert.equal(isForeignLocalePath("/villa-funda"), false);
assert.equal(isForeignLocalePath("/villalar"), false);

assert.equal(shouldNoindexPublicUrl("/en/villa-incl-duo"), true);
assert.equal(shouldNoindexPublicUrl("/de/villa-nordic-dream"), true);
assert.equal(shouldNoindexPublicUrl("/villa-cassaba-ugrar-2"), false);
assert.equal(shouldNoindexPublicUrl("/villalar"), false);
assert.equal(shouldNoindexPublicUrl("/uye"), true);
assert.equal(shouldNoindexPublicUrl("/uye/hesabim"), true);
assert.equal(shouldNoindexPublicUrl("/onay/abc"), true);
assert.equal(
  shouldNoindexPublicUrl("/villalar", "facilities=Balay+Villaları"),
  true
);
assert.equal(
  shouldNoindexPublicUrl("/villalar", "region=cukurbag&sort=random"),
  true
);
assert.equal(shouldNoindexPublicUrl("/villalar", "region=kalkan"), false);
assert.equal(
  shouldNoindexPublicUrl("/villalar", "region=kalkan&page=1"),
  false
);
assert.equal(
  shouldNoindexPublicUrl("/villa-funda", "giristarihi=2026-09-05"),
  false
);

assert.equal(isIndexableVillaSearch(""), true);
assert.equal(isIndexableVillaSearch("region=fethiye"), true);
assert.equal(isIndexableVillaSearch("checkIn=2026-09-20"), false);
assert.equal(villaSearchCanonicalPath("region=fethiye"), "/villalar?region=fethiye");
assert.equal(villaSearchCanonicalPath("sort=price"), "/villalar");

const turlarRedirect = LEGACY_PUBLIC_REDIRECTS.find((item) => item.source === "/turlar");
assert.equal(turlarRedirect?.destination, "/tur/liste");
assert.equal(turlarRedirect?.permanent, true);

const rizaRedirect = LEGACY_PUBLIC_REDIRECTS.find(
  (item) => item.source === "/kurumsal/elektronik-ilet-ve-acik-riza-metni"
);
assert.equal(rizaRedirect?.destination, "/kurumsal/gizlilik-politikasi");

assert.equal(legacyTesisRedirectDestination("/tesis"), "/villalar");
assert.equal(legacyTesisRedirectDestination("/tesis/liste"), "/villalar");
assert.equal(
  legacyTesisRedirectDestination("/tesis/haritali-arama"),
  "/villalar"
);
assert.equal(
  legacyTesisRedirectDestination("/tesis/detay/villa-ersu"),
  "/villa-ersu"
);
assert.equal(
  legacyTesisRedirectDestination("/tesis/detay/bungalov-kumsal"),
  "/bungalov-kumsal"
);
assert.equal(legacyTesisRedirectDestination("/villalar"), null);

assert.equal(
  legacyBrokenPublicPathDestination("/iletisim"),
  "/kurumsal/iletisim"
);
assert.equal(
  legacyBrokenPublicPathDestination("/merak-ettikleriniz"),
  "/sik-sorulan-sorular"
);
assert.equal(legacyBrokenPublicPathDestination("/home/home_14"), "/");
assert.equal(legacyBrokenPublicPathDestination("/tesis/izmir"), "/villalar");
assert.equal(legacyBrokenPublicPathDestination("/otel/home"), "/otel");
assert.equal(
  legacyBrokenPublicPathDestination("/zpara-kazandiran-oteller"),
  "/otel"
);
assert.equal(
  legacyBrokenPublicPathDestination("/arac-kiralama/liste"),
  "/arac-kiralama"
);
assert.equal(legacyBrokenPublicPathDestination("/arac-kiralama"), null);
assert.equal(
  legacyBrokenPublicPathDestination("/destinasyonlar/kas"),
  "/villalar?region=kas"
);
assert.equal(
  legacyBrokenPublicPathDestination("/destinasyonlar/home"),
  "/villalar"
);
assert.equal(
  legacyBrokenPublicPathDestination("/blog/detay/oludeniz-plaji"),
  "/blog/oludeniz-plaji"
);
assert.equal(
  legacyBrokenPublicPathDestination("/rehber/fethiye-havalimani-transfer"),
  "/vip-transfer"
);
assert.equal(legacyBrokenPublicPathDestination("/rehber/home"), "/blog");
assert.equal(legacyBrokenPublicPathDestination("/rota/rota-detay"), "/tur/liste");
assert.equal(
  legacyBrokenPublicPathDestination("/transfer/transfer-single"),
  "/vip-transfer"
);
assert.equal(legacyBrokenPublicPathDestination("/tur/home"), "/tur/liste");
assert.equal(legacyBrokenPublicPathDestination("/bilet/home"), "/bilet/ara");
assert.equal(legacyBrokenPublicPathDestination("/tekne/liste"), "/tur/liste");
assert.equal(
  legacyBrokenPublicPathDestination("/banka-bilgilerimiz"),
  "/kurumsal/banka-bilgilerimiz"
);
assert.equal(
  legacyBrokenPublicPathDestination("/gizlilik-politikasi"),
  "/kurumsal/gizlilik-politikasi"
);
assert.equal(
  legacyBrokenPublicPathDestination("/mesafeli-satis-sozlesmesi"),
  "/kurumsal/gizlilik-politikasi"
);
assert.equal(
  legacyBrokenPublicPathDestination("/kayakoy-villa-kiralama/kas"),
  "/villalar?region=kas"
);
assert.equal(
  legacyBrokenPublicPathDestination("/fethiye-villa-kiralama"),
  "/villalar?region=fethiye"
);

assert.equal(
  wwwHostnameForPublicHost("tatildeyiz.com.tr"),
  "www.tatildeyiz.com.tr"
);
assert.equal(wwwHostnameForPublicHost("www.tatildeyiz.com.tr"), null);

console.log("smoke-public-indexing: OK");

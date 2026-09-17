import assert from "node:assert/strict";
import {
  isForeignLocalePath,
  isIndexableLocale,
  isIndexableVillaSearch,
  shouldNoindexPublicUrl,
  villaSearchCanonicalPath,
} from "../lib/public-indexing";
import { wwwHostnameForPublicHost } from "../lib/i18n/middleware-host";
import { LEGACY_PUBLIC_REDIRECTS, legacyTesisRedirectDestination } from "../lib/legacy-redirects";

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
  wwwHostnameForPublicHost("tatildeyiz.com.tr"),
  "www.tatildeyiz.com.tr"
);
assert.equal(wwwHostnameForPublicHost("www.tatildeyiz.com.tr"), null);

console.log("smoke-public-indexing: OK");

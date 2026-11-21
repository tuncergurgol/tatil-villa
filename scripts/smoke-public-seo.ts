import assert from "node:assert/strict";
import {
  demoteCmsHeadingToH2,
  looksLikeMissingPageText,
  sanitizePublicSeoDescription,
  sanitizePublicSeoTitle,
  upgradeInsecureSiteLinks,
} from "../lib/public-seo";

assert.equal(looksLikeMissingPageText("404 | Tatildeyiz"), true);
assert.equal(looksLikeMissingPageText("Kayboldunuz mu?"), true);
assert.equal(looksLikeMissingPageText("İletişim"), false);

assert.equal(
  sanitizePublicSeoTitle("İletişim | Tatildeyiz", "Tatil Villacısı", "İletişim"),
  "İletişim"
);
assert.equal(
  sanitizePublicSeoTitle("404 | Tatildeyiz", "Tatil Villacısı", "Sayfa"),
  "Sayfa"
);
assert.equal(
  sanitizePublicSeoTitle("Günübirlik Tur | Tatil Villacısı", "Tatil Villacısı", "Tur"),
  "Günübirlik Tur"
);

const description = sanitizePublicSeoDescription(
  "",
  "Gizlilik Politikası",
  "Tatil Villacısı"
);
assert.match(description, /Gizlilik Politikası/);
assert.match(description, /Tatil Villacısı/);

assert.equal(
  demoteCmsHeadingToH2("<h1>Başlık</h1><p>Metin</p>"),
  "<h2>Başlık</h2><p>Metin</p>"
);
assert.equal(
  upgradeInsecureSiteLinks(
    '<a href="http://www.tatilvillacisi.com/kurumsal/iletisim">İletişim</a>'
  ),
  '<a href="https://www.tatilvillacisi.com/kurumsal/iletisim">İletişim</a>'
);

console.log("smoke-public-seo: OK");

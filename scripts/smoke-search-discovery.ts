import assert from "node:assert/strict";
import {
  buildLlmsTxt,
  buildSearchEngineVerification,
  canonicalOriginFromDomain,
  createIndexNowKey,
  indexNowKeyLocation,
} from "../lib/search-discovery";

const origin = canonicalOriginFromDomain("www.tatildeyiz.com.tr");
assert.equal(origin, "https://www.tatildeyiz.com.tr");

const key = createIndexNowKey("www.tatildeyiz.com.tr");
assert.equal(key.length, 32);
assert.match(key, /^[a-f0-9]{32}$/);
assert.equal(
  indexNowKeyLocation(origin, key),
  "https://www.tatildeyiz.com.tr/indexnow-key.txt"
);

const verification = buildSearchEngineVerification({
  googleSearchConsoleCode: "gsc",
  bingWebmasterCode: "bing123",
  yandexWebmasterCode: "yandex123",
});
assert.equal(verification?.google, "gsc");
assert.equal(verification?.yandex, "yandex123");
assert.equal(verification?.other?.["msvalidate.01"], "bing123");

const llms = buildLlmsTxt({
  origin,
  brandName: "Tatildeyiz",
  description: "Kiralık villa",
  villaCount: 10,
});
assert.match(llms, /llms-full\.txt/);
assert.match(llms, /sitemap\.xml/);
assert.match(llms, /\.well-known\/llms\.txt/);

console.log("smoke-search-discovery: OK");

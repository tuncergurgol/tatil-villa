import assert from "node:assert/strict";
import {
  isForeignLocalePath,
  isIndexableLocale,
  shouldNoindexPublicUrl,
} from "../lib/public-indexing";

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
assert.equal(
  shouldNoindexPublicUrl("/villalar", "facilities=Balay+Villaları"),
  true
);
assert.equal(
  shouldNoindexPublicUrl("/villalar", "region=cukurbag&sort=random"),
  true
);
assert.equal(
  shouldNoindexPublicUrl("/villa-funda", "giristarihi=2026-09-05"),
  false
);

console.log("smoke-public-indexing: OK");

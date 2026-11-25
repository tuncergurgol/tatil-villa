import assert from "node:assert/strict";
import { includesPhoneSearch } from "../lib/phone-utils";

const stored = "+905466456072";

assert.equal(includesPhoneSearch(stored, "+90 546 645 60 72"), true);
assert.equal(includesPhoneSearch(stored, "546 645 60 72"), true);
assert.equal(includesPhoneSearch(stored, "5466456072"), true);
assert.equal(includesPhoneSearch(stored, "+90 (546) 645-6072"), true);
assert.equal(includesPhoneSearch(stored, "555 111 22 33"), false);

console.log("customer phone search smoke ok");

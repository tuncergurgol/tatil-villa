import assert from "node:assert/strict";
import { isVillaVisibleForGuest } from "../lib/villa-document-types";

const undocumentedOffer = {
  documentNo: "",
  documentType: null,
  showInSearch: false,
  showInOffer: true,
};

assert.equal(isVillaVisibleForGuest(undocumentedOffer, false), false);
assert.equal(isVillaVisibleForGuest(undocumentedOffer, true), true);

const documentedSearch = {
  documentNo: "35-12345",
  documentType: null,
  showInSearch: true,
  showInOffer: true,
};

assert.equal(isVillaVisibleForGuest(documentedSearch, false), true);
assert.equal(isVillaVisibleForGuest(documentedSearch, true), true);

const documentedOfferOnly = {
  documentNo: "35-12345",
  documentType: null,
  showInSearch: false,
  showInOffer: true,
};

assert.equal(isVillaVisibleForGuest(documentedOfferOnly, true), false);

const hiddenUndocumented = {
  documentNo: "000000000",
  documentType: null,
  showInSearch: false,
  showInOffer: false,
};

assert.equal(isVillaVisibleForGuest(hiddenUndocumented, true), false);

console.log("assistant member undocumented smoke ok");

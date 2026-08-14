import assert from "node:assert/strict";
import {
  getCancellationReasonLabel,
  resolveForceMajeureRefundRecipient,
} from "../lib/booking-cancellation";

assert.equal(
  resolveForceMajeureRefundRecipient("customer_force_majeure"),
  "guest"
);
assert.equal(resolveForceMajeureRefundRecipient("agency"), "owner");
assert.equal(resolveForceMajeureRefundRecipient("owner"), "owner");
assert.equal(resolveForceMajeureRefundRecipient("customer_withdraw"), "owner");
assert.equal(resolveForceMajeureRefundRecipient("calendar_full"), "owner");
assert.match(
  getCancellationReasonLabel("customer_force_majeure"),
  /Mücbir Sebep/
);

console.log("smoke-booking-cancellation: ok");

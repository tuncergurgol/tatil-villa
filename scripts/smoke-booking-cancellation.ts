import assert from "node:assert/strict";
import {
  getCancellationReasonLabel,
  resolveForceMajeureRefundRecipient,
} from "../lib/booking-cancellation";

assert.equal(
  resolveForceMajeureRefundRecipient("customer_force_majeure"),
  "guest"
);
assert.equal(resolveForceMajeureRefundRecipient("agency"), "guest");
assert.equal(resolveForceMajeureRefundRecipient("owner"), "guest");
assert.equal(resolveForceMajeureRefundRecipient("customer_withdraw"), "guest");
assert.equal(resolveForceMajeureRefundRecipient("calendar_full"), "guest");
assert.match(
  getCancellationReasonLabel("customer_force_majeure"),
  /Mücbir Sebep/
);

console.log("smoke-booking-cancellation: ok");

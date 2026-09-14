import assert from "node:assert/strict";
import {
  getExternalLinkSyncBatchOrder,
  getExternalLinkSyncMode,
} from "../lib/external-link-sync-mode";

const order = ([1, 2, 3] as const)
  .map((slot) => ({
    slot,
    mode: getExternalLinkSyncMode(slot),
    order: getExternalLinkSyncBatchOrder(getExternalLinkSyncMode(slot)),
  }))
  .sort((a, b) => a.order - b.order || a.slot - b.slot)
  .map((item) => item.slot);

assert.deepEqual(order, [3, 1, 2]);
console.log("smoke-calendar-price-transfer-link-order: OK", order.join(" → "));

import "server-only";

import { prisma } from "@/lib/db";
import type { Yolcu360Environment } from "@/lib/yolcu360/types";

export { formatYolcu360Money, buildYolcu360TrackingId, getYolcu360BaseUrl } from "@/lib/yolcu360/format";

export const DEFAULT_YOLCU360_SETTINGS = {
  enabled: false,
  publicEnabled: true,
  environment: "staging" as Yolcu360Environment,
  apiKey: "",
  apiSecret: "",
  commissionType: "percentage",
  commissionPercentage: 0,
  defaultPaymentType: "creditCard",
};

export async function getYolcu360Settings() {
  const row = await prisma.yolcu360Settings.findUnique({
    where: { id: "default" },
  });
  if (!row) {
    return { id: "default" as const, ...DEFAULT_YOLCU360_SETTINGS };
  }
  return row;
}


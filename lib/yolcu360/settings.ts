import { prisma } from "@/lib/db";
import type { Yolcu360Environment } from "@/lib/yolcu360/types";

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

export function getYolcu360BaseUrl(environment: string) {
  return environment === "production"
    ? "https://api.pro.yolcu360.com/api/v1"
    : "https://staging.api.pro.yolcu360.com/api/v1";
}

export { formatYolcu360Money } from "@/lib/yolcu360/format-money";

export function buildYolcu360TrackingId() {
  return `TV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

import { notifyIntegrationLead } from "@/lib/integration-lead-notify";
import { formatYolcu360Money } from "@/lib/yolcu360/format-money";

type Yolcu360OrderNotifyRow = {
  yolcu360OrderId: string;
  trackingId: string;
  status: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  carBrand: string;
  carModel: string;
  vendorName: string;
  totalAmount: number;
  currency: string;
  checkInAt: Date | null;
  checkOutAt: Date | null;
};

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function buildYolcu360OrderLeadMessage(
  order: Yolcu360OrderNotifyRow,
  event: "created" | "paid" = "created"
) {
  const title =
    event === "paid"
      ? "Yolcu360 — ödeme tamamlandı"
      : "Yolcu360 — yeni araç kiralama talebi";

  return [
    title,
    "",
    `Sipariş: ${order.yolcu360OrderId}`,
    order.trackingId ? `Takip: ${order.trackingId}` : null,
    `Durum: ${order.status}`,
    `Yolcu: ${order.passengerName || "—"}`,
    `Telefon: ${order.passengerPhone || "—"}`,
    `E-posta: ${order.passengerEmail || "—"}`,
    `Araç: ${[order.carBrand, order.carModel].filter(Boolean).join(" ") || "—"}`,
    `Tedarikçi: ${order.vendorName || "—"}`,
    `Alış: ${formatDate(order.checkInAt)}`,
    `İade: ${formatDate(order.checkOutAt)}`,
    `Tutar: ${formatYolcu360Money(order.totalAmount, order.currency)}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export async function notifyYolcu360OrderLead(
  order: Yolcu360OrderNotifyRow,
  event: "created" | "paid" = "created"
) {
  const message = buildYolcu360OrderLeadMessage(order, event);
  await notifyIntegrationLead({
    kind: "yolcu360",
    subject: `Yolcu360 — ${order.passengerName || order.yolcu360OrderId}`,
    message,
  });
}

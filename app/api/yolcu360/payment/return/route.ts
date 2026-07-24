import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getYolcu360Order } from "@/lib/yolcu360/client";
import { upsertYolcu360OrderFromApi } from "@/lib/yolcu360/orders-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderID = searchParams.get("orderID") ?? searchParams.get("orderId");
  const status = searchParams.get("status") ?? "unknown";

  if (orderID) {
    try {
      const order = await getYolcu360Order(orderID);
      await upsertYolcu360OrderFromApi(order);
    } catch {
      // Yönlendirme yine de devam etsin
    }
  }

  const target = orderID
    ? `/arac-kiralama/basarili?orderID=${encodeURIComponent(orderID)}&status=${encodeURIComponent(status)}`
    : `/arac-kiralama?payment=failed`;

  redirect(target);
}

export async function POST() {
  return NextResponse.json({ ok: true });
}

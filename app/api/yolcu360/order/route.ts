import { NextResponse } from "next/server";
import { getRequestClientIp } from "@/lib/request-client-ip";
import { getYolcu360Settings, buildYolcu360TrackingId } from "@/lib/yolcu360/settings";
import { createYolcu360Order } from "@/lib/yolcu360/client";
import { upsertYolcu360OrderFromApi } from "@/lib/yolcu360/orders-db";
import { yolcu360JsonError, parseJsonBody } from "@/lib/yolcu360/api-helpers";
import type { Yolcu360CreateOrderRequest } from "@/lib/yolcu360/types";

export async function POST(request: Request) {
  try {
    const settings = await getYolcu360Settings();
    if (!settings.enabled || !settings.publicEnabled) {
      return NextResponse.json({ error: "Servis kullanılamıyor" }, { status: 503 });
    }

    const body = await parseJsonBody<
      Yolcu360CreateOrderRequest & { searchSnapshot?: unknown }
    >(request);
    const trackingId = body.trackingID?.trim() || buildYolcu360TrackingId();
    const clientIp = await getRequestClientIp();

    const order = await createYolcu360Order(
      {
        ...body,
        trackingID: trackingId,
        paymentType:
          body.paymentType ??
          (settings.defaultPaymentType as "creditCard" | "limit"),
      },
      clientIp
    );

    await upsertYolcu360OrderFromApi(order, trackingId, body.searchSnapshot);

    return NextResponse.json({ order, trackingId }, { status: 201 });
  } catch (error) {
    return yolcu360JsonError(error, "Sipariş oluşturulamadı");
  }
}

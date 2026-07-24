import { NextResponse } from "next/server";
import { getYolcu360Settings } from "@/lib/yolcu360/settings";
import { getYolcu360InstallmentInfo, payYolcu360Order } from "@/lib/yolcu360/client";
import { yolcu360JsonError, parseJsonBody } from "@/lib/yolcu360/api-helpers";
import type { Yolcu360PayRequest } from "@/lib/yolcu360/types";

export async function POST(request: Request) {
  try {
    const settings = await getYolcu360Settings();
    if (!settings.enabled || !settings.publicEnabled) {
      return NextResponse.json({ error: "Servis kullanılamıyor" }, { status: 503 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "installments") {
      const body = await parseJsonBody<{ orderID: string; binNumber: string }>(request);
      const info = await getYolcu360InstallmentInfo(body.orderID, body.binNumber);
      return NextResponse.json(info);
    }

    const body = await parseJsonBody<Yolcu360PayRequest>(request);
    const result = await payYolcu360Order(body);
    return NextResponse.json(result);
  } catch (error) {
    return yolcu360JsonError(error, "Ödeme işlemi başarısız");
  }
}

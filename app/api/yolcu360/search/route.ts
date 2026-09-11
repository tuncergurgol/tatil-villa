import { NextResponse } from "next/server";
import { getYolcu360Settings } from "@/lib/yolcu360/settings";
import { searchYolcu360Cars } from "@/lib/yolcu360/client";
import { yolcu360JsonError, parseJsonBody } from "@/lib/yolcu360/api-helpers";
import type { Yolcu360SearchPointRequest } from "@/lib/yolcu360/types";

export async function POST(request: Request) {
  try {
    const settings = await getYolcu360Settings();
    if (!settings.enabled || !settings.publicEnabled) {
      return NextResponse.json({ error: "Servis kullanılamıyor" }, { status: 503 });
    }

    const body = await parseJsonBody<Yolcu360SearchPointRequest>(request);
    const result = await searchYolcu360Cars({
      ...body,
      paymentType: body.paymentType ?? (settings.defaultPaymentType as "creditCard" | "limit"),
    });
    return NextResponse.json(result);
  } catch (error) {
    return yolcu360JsonError(error, "Araç araması başarısız");
  }
}

import { NextResponse } from "next/server";
import { getYolcu360Order } from "@/lib/yolcu360/client";
import { upsertYolcu360OrderFromApi } from "@/lib/yolcu360/orders-db";
import { yolcu360JsonError } from "@/lib/yolcu360/api-helpers";

type Params = { params: Promise<{ orderId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { orderId } = await params;
    const order = await getYolcu360Order(orderId);
    await upsertYolcu360OrderFromApi(order);
    return NextResponse.json(order);
  } catch (error) {
    return yolcu360JsonError(error, "Sipariş alınamadı");
  }
}

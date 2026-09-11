import { NextResponse } from "next/server";
import { getYolcu360Order } from "@/lib/yolcu360/client";
import { upsertYolcu360OrderFromApi } from "@/lib/yolcu360/orders-db";

function buildSuccessPath(orderID: string | null, status: string) {
  return orderID
    ? `/arac-kiralama/basarili?orderID=${encodeURIComponent(orderID)}&status=${encodeURIComponent(status)}`
    : `/arac-kiralama?payment=failed`;
}

function paymentReturnHtml(targetPath: string) {
  const safeTarget = JSON.stringify(targetPath);
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>Ödeme tamamlanıyor…</title>
  <script>window.top.location.replace(${safeTarget});</script>
</head>
<body><p>Ödeme sonucu yükleniyor…</p></body>
</html>`;
}

async function syncOrder(orderID: string | null) {
  if (!orderID) return;
  try {
    const order = await getYolcu360Order(orderID);
    await upsertYolcu360OrderFromApi(order);
  } catch {
    // Yönlendirme yine de devam etsin
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderID = searchParams.get("orderID") ?? searchParams.get("orderId");
  const status = searchParams.get("status") ?? "success";

  await syncOrder(orderID);

  const target = buildSuccessPath(orderID, status);
  return new NextResponse(paymentReturnHtml(target), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let orderID: string | null = null;
  let status = "success";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as Record<string, unknown>;
    orderID =
      typeof body.orderID === "string"
        ? body.orderID
        : typeof body.orderId === "string"
          ? body.orderId
          : null;
    status = typeof body.status === "string" ? body.status : status;
  } else {
    const form = await request.formData();
    orderID =
      form.get("orderID")?.toString() ??
      form.get("orderId")?.toString() ??
      null;
    status = form.get("status")?.toString() ?? status;
  }

  await syncOrder(orderID);

  const target = buildSuccessPath(orderID, status);
  return new NextResponse(paymentReturnHtml(target), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

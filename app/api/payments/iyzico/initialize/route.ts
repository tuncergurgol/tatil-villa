import { NextResponse } from "next/server";
import {
  parseBookingDetails,
  resolveExternalCode,
} from "@/lib/booking-form-details";
import {
  buildBookingPaymentDescription,
  startBookingIyzicoCheckout,
} from "@/lib/payments/booking-iyzico-checkout";
import {
  getBookingForIyzicoInitialize,
  getPublicBookingPaymentPage,
} from "@/lib/queries/booking-payment-redirect";

export const dynamic = "force-dynamic";

function resolveClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "127.0.0.1";
  return request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

export async function POST(request: Request) {
  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const code = (body.code ?? "").trim();
  if (!code) {
    return NextResponse.json(
      { error: "Rezervasyon numarası gerekli." },
      { status: 400 }
    );
  }

  const pageResult = await getPublicBookingPaymentPage(code);
  if (!pageResult.ok) {
    return NextResponse.json({ error: pageResult.error }, { status: 400 });
  }

  if (pageResult.page.alreadyPaid) {
    return NextResponse.json(
      { error: "Bu rezervasyon için ödeme zaten alınmış." },
      { status: 400 }
    );
  }

  const booking = await getBookingForIyzicoInitialize(code);
  if (!booking) {
    return NextResponse.json({ error: "Rezervasyon bulunamadı." }, { status: 404 });
  }

  const reservationCode =
    resolveExternalCode(booking.externalCode, booking.guestEmail) || code;

  const result = await startBookingIyzicoCheckout({
    bookingId: booking.id,
    reservationCode,
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
    guestPhone: booking.guestPhone,
    amount: pageResult.page.amount,
    callbackOrigin: pageResult.page.callbackOrigin,
    clientIp: resolveClientIp(request),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    checkoutFormContent: result.checkoutFormContent,
    description: buildBookingPaymentDescription(
      booking.guestName,
      reservationCode
    ),
  });
}

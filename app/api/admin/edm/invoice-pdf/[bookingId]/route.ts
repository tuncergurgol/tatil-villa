import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensureEdmInvoicePdfForBooking } from "@/lib/edm/invoice-file";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const { bookingId } = await params;
  if (!bookingId?.trim()) {
    return NextResponse.json(
      { error: "Rezervasyon kimliği gerekli" },
      { status: 400 }
    );
  }

  const forceRefresh = new URL(request.url).searchParams.get("refresh") === "1";

  try {
    const pdf = await ensureEdmInvoicePdfForBooking(bookingId, {
      forceRefresh,
    });
    return new NextResponse(new Uint8Array(pdf.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdf.downloadName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[edm-invoice-pdf]", { bookingId, error });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "EDM fatura PDF indirilemedi",
      },
      { status: 502 }
    );
  }
}

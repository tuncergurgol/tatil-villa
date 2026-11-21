import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  buildReservationDocumentDataForBooking,
} from "@/lib/reservation-document-mail";
import { buildReservationDocumentPdf } from "@/lib/reservation-document-pdf";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
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

  try {
    const data = await buildReservationDocumentDataForBooking(bookingId);
    const pdf = await buildReservationDocumentPdf(data);
    const filename = `konfirme-belgesi-${data.reservationCode}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[confirmation-pdf-download]", { bookingId, error });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Konfirme belgesi üretilemedi",
      },
      { status: 500 }
    );
  }
}

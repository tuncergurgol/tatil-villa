import type { Metadata } from "next";
import BookingConfirmationForm from "@/components/booking-confirmation/BookingConfirmationForm";
import { getBookingForPublicConfirmation } from "@/lib/queries/booking-confirmation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rezervasyon Onayı",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ rezId?: string; RezID?: string; mail?: string }>;
}

export default async function BookingConfirmationPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const rezId = (params.rezId || params.RezID || "").trim();
  const mail = (params.mail || "").trim();

  if (!rezId) {
    return (
      <div className="bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-bold text-slate-900">
            Rezervasyon Onayı
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Geçerli bir rezervasyon bağlantısı gerekli. Lütfen e-postanızdaki
            onay linkini kullanın.
          </p>
        </div>
      </div>
    );
  }

  const result = await getBookingForPublicConfirmation({ rezId, mail });

  if (!result.ok) {
    return (
      <div className="bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-bold text-slate-900">
            Rezervasyon Onayı
          </h1>
          <p className="mt-3 text-sm text-red-600">{result.error}</p>
        </div>
      </div>
    );
  }

  const { booking } = result;
  const serializable = {
    ...booking,
    checkIn: booking.checkIn.toISOString(),
    checkOut: booking.checkOut.toISOString(),
  };

  return (
    <div className="bg-slate-50 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <BookingConfirmationForm
          booking={serializable}
          mail={mail || undefined}
        />
      </div>
    </div>
  );
}

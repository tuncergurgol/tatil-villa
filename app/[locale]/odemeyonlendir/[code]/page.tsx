import type { Metadata } from "next";
import BookingPaymentRedirectView from "@/components/payments/BookingPaymentRedirectView";
import { getPublicBookingPaymentPage } from "@/lib/queries/booking-payment-redirect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Online Ödeme",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ sonuc?: string; tutar?: string }>;
}

export default async function BookingPaymentRedirectPage({
  params,
  searchParams,
}: PageProps) {
  const { code } = await params;
  const query = await searchParams;
  const result = await getPublicBookingPaymentPage(code);

  if (!result.ok) {
    return (
      <div className="bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-bold text-slate-900">Online Ödeme</h1>
          <p className="mt-3 text-sm text-red-600">{result.error}</p>
        </div>
      </div>
    );
  }

  const sonuc = query.sonuc?.trim();
  const parsedResult =
    sonuc === "basarili"
      ? ("basarili" as const)
      : sonuc === "basarisiz"
        ? ("basarisiz" as const)
        : null;
  const paidAmount = query.tutar ? Number.parseInt(query.tutar, 10) : null;

  return (
    <div className="bg-slate-50 py-12 sm:py-16">
      <div className="mx-auto px-4 sm:px-6">
        <BookingPaymentRedirectView
          page={result.page}
          result={parsedResult}
          paidAmount={Number.isFinite(paidAmount ?? NaN) ? paidAmount : null}
        />
      </div>
    </div>
  );
}

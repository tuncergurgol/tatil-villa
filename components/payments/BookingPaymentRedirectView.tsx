"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import IyzicoCheckoutPopup from "@/components/payments/IyzicoCheckoutPopup";
import type { PublicBookingPaymentPageData } from "@/lib/queries/booking-payment-redirect";
import { useState } from "react";

type BookingPaymentRedirectViewProps = {
  page: PublicBookingPaymentPageData;
  result?: "basarili" | "basarisiz" | null;
  paidAmount?: number | null;
};

function formatMoney(amount: number): string {
  return `${amount.toLocaleString("tr-TR")} TL`;
}

export default function BookingPaymentRedirectView({
  page,
  result = null,
  paidAmount = null,
}: BookingPaymentRedirectViewProps) {
  const [error, setError] = useState<string | null>(null);

  if (result === "basarili") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">
          Ödemeniz Alındı
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {page.guestName} — {page.reservationCode} nolu rezervasyon
        </p>
        {paidAmount != null && paidAmount > 0 ? (
          <p className="mt-3 text-lg font-semibold text-emerald-700">
            {formatMoney(paidAmount)}
          </p>
        ) : null}
        <p className="mt-4 text-sm text-slate-500">
          Ödeme işleminiz başarıyla tamamlandı. Acentemiz en kısa sürede sizinle
          iletişime geçecektir.
        </p>
      </div>
    );
  }

  if (result === "basarisiz") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">
          Ödeme Tamamlanamadı
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          İşlem iptal edildi veya banka tarafından onaylanmadı.
        </p>
        <div className="mt-6 text-left">
          <IyzicoCheckoutPopup
            reservationCode={page.reservationCode}
            onError={setError}
          />
        </div>
        {error ? (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        ) : null}
      </div>
    );
  }

  if (page.alreadyPaid) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">
          Ödeme Zaten Alınmış
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {page.reservationCode} nolu rezervasyon için toplam{" "}
          <span className="font-semibold">{formatMoney(page.paidTotal)}</span>{" "}
          kayıtlı.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        {page.brandName}
      </p>
      <h1 className="mt-1 text-xl font-bold text-slate-900">Online Ödeme</h1>
      <p className="mt-2 text-sm text-slate-600">
        {page.guestName} — {page.villaName}
      </p>
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-600">Rezervasyon No</span>
          <span className="font-semibold text-slate-900">
            {page.reservationCode}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-slate-600">Ödenecek Tutar</span>
          <span className="text-lg font-bold text-emerald-700">
            {formatMoney(page.amount)}
          </span>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Kart bilgileriniz iyzico güvenli ödeme ekranında işlenir; sistemimizde
        saklanmaz.
      </p>

      <IyzicoCheckoutPopup
        reservationCode={page.reservationCode}
        onError={setError}
      />

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

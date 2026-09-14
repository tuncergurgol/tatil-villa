"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import ConfettiBurst from "@/components/celebration/ConfettiBurst";

type BookingSuccessCelebrationProps = {
  reservationCode: string;
  villaName: string;
  dateLabel: string;
  guestLabel: string;
  totalLabel?: string | null;
};

/**
 * Public talep success — 5 sn confetti + özet kartı.
 */
export default function BookingSuccessCelebration({
  reservationCode,
  villaName,
  dateLabel,
  guestLabel,
  totalLabel,
}: BookingSuccessCelebrationProps) {
  const [showCelebration, setShowCelebration] = useState(true);
  const handleComplete = useCallback(() => setShowCelebration(false), []);

  return (
    <div className="relative mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
      {showCelebration ? (
        <ConfettiBurst onComplete={handleComplete} />
      ) : null}
      <CheckCircle className="mx-auto h-16 w-16 text-teal-600" />
      <h1 className="mt-4 text-2xl font-bold text-gray-900">
        Rezervasyon Talebiniz Alındı
      </h1>
      <p className="mt-2 text-gray-600">
        En kısa sürede sizinle iletişime geçeceğiz.
      </p>

      <div className="mt-8 rounded-xl bg-gray-50 p-5 text-left text-sm">
        <p className="mt-2">
          <span className="font-medium text-gray-700">Rezervasyon No:</span>{" "}
          {reservationCode}
        </p>
        <p className="mt-2">
          <span className="font-medium text-gray-700">Villa:</span> {villaName}
        </p>
        <p className="mt-2">
          <span className="font-medium text-gray-700">Tarih:</span> {dateLabel}
        </p>
        <p className="mt-2">
          <span className="font-medium text-gray-700">Misafir:</span> {guestLabel}
        </p>
        {totalLabel ? (
          <p className="mt-2">
            <span className="font-medium text-gray-700">Toplam:</span> {totalLabel}
          </p>
        ) : null}
        <p className="mt-2">
          <span className="font-medium text-gray-700">Durum:</span>{" "}
          <span className="text-amber-600">Onay bekliyor</span>
        </p>
      </div>

      <Link
        href="/villalar"
        className="mt-8 inline-block rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-700"
      >
        Villalara Dön
      </Link>
    </div>
  );
}

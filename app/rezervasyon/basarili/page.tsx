import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { getBookingById } from "@/lib/queries/bookings";
import { formatPrice } from "@/lib/utils";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function BookingSuccessPage({ searchParams }: PageProps) {
  const { id } = await searchParams;
  if (!id) notFound();

  const booking = await getBookingById(id);
  if (!booking) notFound();

  const nights = Math.ceil(
    (booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24)
  );

  const guestParts = [`${booking.adults} yetişkin`];
  if (booking.children > 0) guestParts.push(`${booking.children} çocuk`);
  if (booking.babies > 0) guestParts.push(`${booking.babies} bebek`);
  if (booking.pets > 0) guestParts.push(`${booking.pets} evcil hayvan`);

  return (
    <div className="bg-gray-50 py-16">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
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
            {booking.externalCode ?? "—"}
          </p>
          <p className="mt-2">
            <span className="font-medium text-gray-700">Villa:</span>{" "}
            {booking.villa.name}
          </p>
          <p className="mt-2">
            <span className="font-medium text-gray-700">Tarih:</span>{" "}
            {booking.checkIn.toLocaleDateString("tr-TR")} —{" "}
            {booking.checkOut.toLocaleDateString("tr-TR")} ({nights} gece)
          </p>
          <p className="mt-2">
            <span className="font-medium text-gray-700">Misafir:</span>{" "}
            {booking.guestName} ({guestParts.join(", ")})
          </p>
          {booking.totalPrice != null && (
            <p className="mt-2">
              <span className="font-medium text-gray-700">Toplam:</span>{" "}
              {formatPrice(booking.totalPrice)}
            </p>
          )}
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
    </div>
  );
}

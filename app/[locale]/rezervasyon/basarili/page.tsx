import { getBookingById } from "@/lib/queries/bookings";
import { formatPrice } from "@/lib/utils";
import { notFound } from "next/navigation";
import BookingSuccessCelebration from "@/components/celebration/BookingSuccessCelebration";

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

  const dateLabel = `${booking.checkIn.toLocaleDateString("tr-TR")} — ${booking.checkOut.toLocaleDateString("tr-TR")} (${nights} gece)`;
  const guestLabel = `${booking.guestName} (${guestParts.join(", ")})`;

  return (
    <div className="bg-gray-50 py-16">
      <BookingSuccessCelebration
        reservationCode={
          booking.externalCode != null
            ? String(booking.externalCode)
            : "—"
        }
        villaName={booking.villa.name}
        dateLabel={dateLabel}
        guestLabel={guestLabel}
        totalLabel={
          booking.totalPrice != null ? formatPrice(booking.totalPrice) : null
        }
      />
    </div>
  );
}

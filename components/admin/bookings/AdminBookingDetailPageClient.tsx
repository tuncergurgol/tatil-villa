"use client";

import { useRouter } from "next/navigation";
import BookingDetailModal from "@/components/admin/bookings/BookingDetailModal";

export default function AdminBookingDetailPageClient({
  bookingId,
}: {
  bookingId: string;
}) {
  const router = useRouter();

  return (
    <div className="min-h-[50vh]">
      <BookingDetailModal
        bookingId={bookingId}
        onClose={() => {
          // Yeni sekmede açıldıysa sekmeyi kapatmayı dene; olmazsa listeye dön
          window.close();
          router.push("/admin/rezervasyonlar");
        }}
        onSaved={() => {
          router.refresh();
        }}
      />
    </div>
  );
}

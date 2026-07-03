import { getAllBookings } from "@/lib/queries/bookings";
import { formatPrice } from "@/lib/utils";
import { changeBookingStatus } from "@/app/actions/admin/bookings";
import { BookingStatus } from "@prisma/client";

const statusLabels: Record<BookingStatus, string> = {
  PENDING: "Bekliyor",
  CONFIRMED: "Onaylandı",
  CANCELLED: "İptal",
};

const statusColors: Record<BookingStatus, string> = {
  PENDING: "text-amber-600 bg-amber-50",
  CONFIRMED: "text-green-700 bg-green-50",
  CANCELLED: "text-red-600 bg-red-50",
};

export default async function AdminBookingsPage() {
  const bookings = await getAllBookings();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Rezervasyonlar</h1>
      <p className="text-gray-500">{bookings.length} kayıt</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Misafir</th>
              <th className="px-4 py-3 font-medium">Villa</th>
              <th className="px-4 py-3 font-medium">Tarih</th>
              <th className="px-4 py-3 font-medium">Tutar</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{booking.guestName}</p>
                  <p className="text-xs text-gray-500">{booking.guestEmail}</p>
                </td>
                <td className="px-4 py-3">{booking.villa.name}</td>
                <td className="px-4 py-3 text-gray-600">
                  {booking.checkIn.toLocaleDateString("tr-TR")} —{" "}
                  {booking.checkOut.toLocaleDateString("tr-TR")}
                </td>
                <td className="px-4 py-3">
                  {booking.totalPrice != null
                    ? formatPrice(booking.totalPrice)
                    : "Teklif"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[booking.status]}`}
                  >
                    {statusLabels[booking.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {booking.status !== BookingStatus.CONFIRMED && (
                      <form
                        action={async () => {
                          "use server";
                          await changeBookingStatus(booking.id, BookingStatus.CONFIRMED);
                        }}
                      >
                        <button type="submit" className="text-green-600 hover:underline">
                          Onayla
                        </button>
                      </form>
                    )}
                    {booking.status !== BookingStatus.CANCELLED && (
                      <form
                        action={async () => {
                          "use server";
                          await changeBookingStatus(booking.id, BookingStatus.CANCELLED);
                        }}
                      >
                        <button type="submit" className="text-red-600 hover:underline">
                          İptal
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

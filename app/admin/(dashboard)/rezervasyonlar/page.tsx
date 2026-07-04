import BookingManagement from "@/components/admin/bookings/BookingManagement";
import { getAdminBookingListData } from "@/lib/queries/admin-bookings";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const data = await getAdminBookingListData();

  return (
    <BookingManagement
      bookings={data.bookings}
      villas={data.villas}
      siteDomain={data.siteDomain}
    />
  );
}

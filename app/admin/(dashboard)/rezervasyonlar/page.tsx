import BookingManagement from "@/components/admin/bookings/BookingManagement";
import { parseBookingFiltersFromUrl } from "@/lib/booking-filter-url";
import { getAdminBookingListData } from "@/lib/queries/admin-bookings";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminBookingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const [data, initialFilters] = await Promise.all([
    getAdminBookingListData(),
    Promise.resolve(parseBookingFiltersFromUrl(params)),
  ]);

  return (
    <BookingManagement
      bookings={data.bookings}
      villas={data.villas}
      siteDomain={data.siteDomain}
      initialFilters={initialFilters}
    />
  );
}

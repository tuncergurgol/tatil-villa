import TourManagement from "@/components/admin/tours/TourManagement";
import { getToursAdminData } from "@/lib/queries/tours";

export const dynamic = "force-dynamic";

export default async function AdminTurPage() {
  const data = await getToursAdminData();

  return (
    <TourManagement
      items={data.items}
      totalCount={data.totalCount}
      activeCount={data.activeCount}
    />
  );
}

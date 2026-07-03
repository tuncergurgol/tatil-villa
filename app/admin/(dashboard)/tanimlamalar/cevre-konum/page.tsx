import SurroundingManagement from "@/components/admin/surrounding/SurroundingManagement";
import { getSurroundingAdminData } from "@/lib/queries/surrounding";

export const dynamic = "force-dynamic";

export default async function CevreKonumPage() {
  const { categories, totalLocations } = await getSurroundingAdminData();

  return (
    <SurroundingManagement
      categories={categories}
      totalLocations={totalLocations}
    />
  );
}

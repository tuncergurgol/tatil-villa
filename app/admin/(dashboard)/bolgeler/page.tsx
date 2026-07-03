import { getAdminRegionData } from "@/lib/queries/regions";
import RegionManagement from "@/components/admin/regions/RegionManagement";

export const dynamic = "force-dynamic";

export default async function AdminRegionsPage() {
  const { tree, flat, stats } = await getAdminRegionData();

  return <RegionManagement tree={tree} flat={flat} stats={stats} />;
}

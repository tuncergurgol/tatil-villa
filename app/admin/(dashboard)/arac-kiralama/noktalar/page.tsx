import CarRentalLocationManagement from "@/components/admin/car-rental/CarRentalLocationManagement";
import { getCarRentalLocationsAdminData } from "@/lib/queries/car-rental";

export const dynamic = "force-dynamic";

export default async function AracKiralamaNoktalarPage() {
  const data = await getCarRentalLocationsAdminData();
  return <CarRentalLocationManagement {...data} />;
}

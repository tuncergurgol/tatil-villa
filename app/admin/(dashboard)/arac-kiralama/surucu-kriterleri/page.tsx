import CarRentalCriterionManagement from "@/components/admin/car-rental/CarRentalCriterionManagement";
import { getCarRentalCriteriaAdminData } from "@/lib/queries/car-rental";

export const dynamic = "force-dynamic";

export default async function AracKiralamaSurucuKriterleriPage() {
  const data = await getCarRentalCriteriaAdminData();
  return <CarRentalCriterionManagement {...data} />;
}

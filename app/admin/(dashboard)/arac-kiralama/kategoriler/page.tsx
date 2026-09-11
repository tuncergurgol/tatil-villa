import CarRentalCategoryManagement from "@/components/admin/car-rental/CarRentalCategoryManagement";
import { getCarRentalCategoriesAdminData } from "@/lib/queries/car-rental";

export const dynamic = "force-dynamic";

export default async function AracKiralamaKategorilerPage() {
  const data = await getCarRentalCategoriesAdminData();
  return <CarRentalCategoryManagement {...data} />;
}

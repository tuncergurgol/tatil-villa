import CarRentalSearchSettingsForm from "@/components/admin/car-rental/CarRentalSearchSettingsForm";
import { getCarRentalPageSettings } from "@/lib/queries/car-rental";

export const dynamic = "force-dynamic";

export default async function AracKiralamaAramaCubuguPage() {
  const settings = await getCarRentalPageSettings();
  return <CarRentalSearchSettingsForm settings={settings} />;
}

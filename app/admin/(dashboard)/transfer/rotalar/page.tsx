import TransferRouteManagement from "@/components/admin/transfer/TransferRouteManagement";
import { getTransferRoutesAdminData } from "@/lib/queries/transfer-routes";
import { getTransferVehicleTypesForPicker } from "@/lib/queries/transfer-vehicle-types";

export const dynamic = "force-dynamic";

export default async function TransferRotalarPage() {
  const [{ items, totalCount, activeCount }, vehicleTypes] = await Promise.all([
    getTransferRoutesAdminData(),
    getTransferVehicleTypesForPicker(),
  ]);

  return (
    <TransferRouteManagement
      items={items}
      vehicleTypes={vehicleTypes}
      totalCount={totalCount}
      activeCount={activeCount}
    />
  );
}

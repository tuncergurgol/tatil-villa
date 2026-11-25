import TransferVehicleTypeManagement from "@/components/admin/transfer/TransferVehicleTypeManagement";
import { getTransferVehicleTypesAdminData } from "@/lib/queries/transfer-vehicle-types";

export const dynamic = "force-dynamic";

export default async function TransferAracTipleriPage() {
  const { items, totalCount, activeCount } =
    await getTransferVehicleTypesAdminData();

  return (
    <TransferVehicleTypeManagement
      items={items}
      totalCount={totalCount}
      activeCount={activeCount}
    />
  );
}

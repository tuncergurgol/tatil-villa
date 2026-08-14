import TransferTripManagement from "@/components/admin/transfer/TransferTripManagement";
import { getTransferRoutesForPicker } from "@/lib/queries/transfer-routes";
import { getTransferTripsAdminData } from "@/lib/queries/transfer-trips";
import { getTransferVehicleTypesForPicker } from "@/lib/queries/transfer-vehicle-types";

export const dynamic = "force-dynamic";

export default async function TransferSeferlerPage() {
  const [trips, routes, vehicleTypes] = await Promise.all([
    getTransferTripsAdminData(),
    getTransferRoutesForPicker(),
    getTransferVehicleTypesForPicker(),
  ]);

  return (
    <TransferTripManagement
      items={trips.items}
      routes={routes}
      vehicleTypes={vehicleTypes}
      totalCount={trips.totalCount}
      newCount={trips.newCount}
      confirmedCount={trips.confirmedCount}
    />
  );
}

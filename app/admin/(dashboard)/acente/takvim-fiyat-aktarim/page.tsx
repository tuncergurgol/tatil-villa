import CalendarPriceTransferManagement from "@/components/admin/agency/CalendarPriceTransferManagement";
import { getCalendarPriceTransferAutoUpdateSettings } from "@/lib/calendar-price-transfer-auto-sync";
import { getCalendarPriceTransferAdminData } from "@/lib/queries/calendar-price-transfer";

export const dynamic = "force-dynamic";

export default async function CalendarPriceTransferPage() {
  const [{ rows, whatsappGroups }, autoUpdate] = await Promise.all([
    getCalendarPriceTransferAdminData(),
    getCalendarPriceTransferAutoUpdateSettings(),
  ]);

  return (
    <div className="space-y-6">
      <CalendarPriceTransferManagement
        rows={rows}
        whatsappGroups={whatsappGroups}
        autoUpdate={autoUpdate}
      />
    </div>
  );
}

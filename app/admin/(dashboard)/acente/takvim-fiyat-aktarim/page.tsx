import CalendarPriceTransferManagement from "@/components/admin/agency/CalendarPriceTransferManagement";
import { getCalendarPriceTransferAdminData } from "@/lib/queries/calendar-price-transfer";

export const dynamic = "force-dynamic";

export default async function CalendarPriceTransferPage() {
  const { rows, whatsappGroups } = await getCalendarPriceTransferAdminData();

  return (
    <div className="space-y-6">
      <CalendarPriceTransferManagement
        rows={rows}
        whatsappGroups={whatsappGroups}
      />
    </div>
  );
}

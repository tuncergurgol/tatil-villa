import CalendarPriceTransferManagement from "@/components/admin/agency/CalendarPriceTransferManagement";
import { getCalendarPriceTransferRows } from "@/lib/queries/calendar-price-transfer";

export const dynamic = "force-dynamic";

export default async function CalendarPriceTransferPage() {
  const rows = await getCalendarPriceTransferRows();

  return (
    <div className="space-y-6">
      <CalendarPriceTransferManagement rows={rows} />
    </div>
  );
}

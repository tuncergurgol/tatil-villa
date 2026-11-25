import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import Yolcu360OrdersTable from "@/components/admin/yolcu360/Yolcu360OrdersTable";
import { listYolcu360Orders } from "@/lib/yolcu360/orders-db";

export const dynamic = "force-dynamic";

export default async function Yolcu360OrdersPage() {
  await requireAdmin();
  const orders = await listYolcu360Orders(100);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yolcu360 Siparişleri</h1>
          <p className="mt-1 text-sm text-gray-500">
            API üzerinden oluşturulan araç kiralama siparişleri.
          </p>
        </div>
        <Link
          href="/admin/yolcu360"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
        >
          ← Ayarlara dön
        </Link>
      </header>

      <Yolcu360OrdersTable orders={orders} />
    </div>
  );
}

import Link from "next/link";
import BiletallInquiriesTable from "@/components/admin/obilet/BiletallInquiriesTable";
import { requireAdmin } from "@/lib/auth-helpers";
import { listBiletallInquiries } from "@/lib/queries/integration-inbox";

export const dynamic = "force-dynamic";

export default async function ObiletTaleplerPage() {
  await requireAdmin();
  const inquiries = await listBiletallInquiries();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/obilet"
            className="text-sm font-semibold text-sky-700 hover:underline"
          >
            ← Obilet ayarları
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Obilet talepleri</h1>
          <p className="mt-1 text-sm text-gray-500">
            Bilet satın alma sonrası gelen yeni işlemler.
          </p>
        </div>
      </div>

      <BiletallInquiriesTable inquiries={inquiries} />
    </div>
  );
}

import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { deleteVilla } from "@/app/actions/admin/villas";

export default async function AdminVillasPage() {
  const villas = await prisma.villa.findMany({
    include: { region: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Villalar</h1>
          <p className="text-gray-500">{villas.length} kayıt</p>
        </div>
        <Link
          href="/admin/villalar/yeni"
          className="flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Yeni Villa
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Villa</th>
              <th className="px-4 py-3 font-medium">Bölge</th>
              <th className="px-4 py-3 font-medium">Fiyat</th>
              <th className="px-4 py-3 font-medium">Etiketler</th>
              <th className="px-4 py-3 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {villas.map((villa) => (
              <tr key={villa.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{villa.name}</td>
                <td className="px-4 py-3 text-gray-600">{villa.region.name}</td>
                <td className="px-4 py-3">
                  {villa.pricePerNight
                    ? formatPrice(villa.pricePerNight)
                    : "Teklif"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {villa.popular && (
                      <span className="rounded bg-teal-100 px-1.5 py-0.5 text-xs text-teal-800">
                        Popüler
                      </span>
                    )}
                    {villa.deal && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                        Fırsat
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/villalar/${villa.id}/duzenle`}
                      className="text-teal-600 hover:underline"
                    >
                      Düzenle
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await deleteVilla(villa.id);
                      }}
                    >
                      <button type="submit" className="text-red-600 hover:underline">
                        Sil
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

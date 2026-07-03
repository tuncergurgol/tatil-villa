import { getAllRegions } from "@/lib/queries/regions";
import { createRegion, deleteRegion, updateRegion } from "@/app/actions/admin/regions";
import { prisma } from "@/lib/db";

export default async function AdminRegionsPage() {
  const regions = await getAllRegions();

  const regionsWithCount = await Promise.all(
    regions.map(async (r) => ({
      ...r,
      count: await prisma.villa.count({ where: { regionId: r.id } }),
    }))
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Bölgeler</h1>

      <form action={createRegion} className="mt-6 space-y-3 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Yeni Bölge</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input name="name" placeholder="Bölge adı" required className="rounded-lg border px-3 py-2 text-sm" />
          <input name="slug" placeholder="slug" required className="rounded-lg border px-3 py-2 text-sm" />
          <input name="image" placeholder="Görsel URL" required className="rounded-lg border px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white">
          Ekle
        </button>
      </form>

      <div className="mt-8 space-y-4">
        {regionsWithCount.map((region) => (
          <div key={region.id} className="rounded-xl border bg-white p-5">
            <form action={updateRegion.bind(null, region.id)} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <input name="name" defaultValue={region.name} required className="rounded-lg border px-3 py-2 text-sm" />
                <input name="slug" defaultValue={region.slug} required className="rounded-lg border px-3 py-2 text-sm" />
                <input name="image" defaultValue={region.image} required className="rounded-lg border px-3 py-2 text-sm" />
              </div>
              <p className="text-xs text-gray-500">{region.count} villa</p>
              <button type="submit" className="text-sm text-teal-600 hover:underline">
                Güncelle
              </button>
            </form>
            {region.count === 0 && (
              <form
                action={async () => {
                  "use server";
                  await deleteRegion(region.id);
                }}
                className="mt-2"
              >
                <button type="submit" className="text-sm text-red-600 hover:underline">
                  Sil
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import VillaForm from "@/components/admin/VillaForm";
import { getMahalleRegionsForSelect } from "@/lib/queries/region-tree";

export default async function NewVillaPage() {
  const regions = await getMahalleRegionsForSelect();

  return (
    <div>
      <Link href="/admin/villalar" className="text-sm text-teal-600 hover:underline">
        ← Villalara Dön
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Yeni Villa</h1>
      <div className="mt-6">
        <VillaForm regions={regions} />
      </div>
    </div>
  );
}

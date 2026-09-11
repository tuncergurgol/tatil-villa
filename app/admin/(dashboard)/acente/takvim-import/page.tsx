import VillaPeriodImportManagement from "@/components/admin/agency/VillaPeriodImportManagement";
import { getVillaPeriodImportRows } from "@/lib/queries/villa-period-import";

export const dynamic = "force-dynamic";

function parseVillaIdParam(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default async function AcenteTakvimImportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const fromVillaId = parseVillaIdParam(params.from, 1);
  const toVillaId = Math.max(fromVillaId, parseVillaIdParam(params.to, 100));
  const rows = await getVillaPeriodImportRows(fromVillaId, toVillaId);

  return (
    <div className="space-y-6">
      <VillaPeriodImportManagement
        rows={rows}
        initialFrom={fromVillaId}
        initialTo={toVillaId}
      />
    </div>
  );
}

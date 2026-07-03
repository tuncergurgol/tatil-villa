import PriceInclusionManagement from "@/components/admin/price-inclusion/PriceInclusionManagement";
import { getPriceInclusionAdminData } from "@/lib/queries/price-inclusion";

export const dynamic = "force-dynamic";

export default async function FiyataDahilPage() {
  const { included, excluded, totalCount, defaultCount } =
    await getPriceInclusionAdminData();

  return (
    <PriceInclusionManagement
      included={included}
      excluded={excluded}
      totalCount={totalCount}
      defaultCount={defaultCount}
    />
  );
}

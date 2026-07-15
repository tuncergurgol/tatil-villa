import AvailabilitySearchPage from "@/components/admin/availability/AvailabilitySearchPage";
import { requireAdmin } from "@/lib/auth-helpers";
import { getAvailabilitySearchPageData } from "@/lib/queries/availability-search";

export const dynamic = "force-dynamic";

export default async function UygunlukPage() {
  await requireAdmin();
  const pageData = await getAvailabilitySearchPageData();

  return <AvailabilitySearchPage pageData={pageData} />;
}

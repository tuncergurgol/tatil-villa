import AvailabilitySearchPage from "@/components/admin/availability/AvailabilitySearchPage";
import { getAvailabilitySearchPageData } from "@/lib/queries/availability-search";

export const dynamic = "force-dynamic";

export default async function UygunlukPage() {
  const pageData = await getAvailabilitySearchPageData();

  return <AvailabilitySearchPage pageData={pageData} />;
}

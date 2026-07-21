import CallbackRequestManagement from "@/components/admin/callback-requests/CallbackRequestManagement";
import { parseCallbackListFilterFromUrl } from "@/lib/booking-filter-url";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  getAllCallbackRequests,
  getCallbackRequestCounts,
} from "@/lib/queries/callback-requests";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SiziArayalimPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const [items, counts, initialListFilter] = await Promise.all([
    getAllCallbackRequests(),
    getCallbackRequestCounts(),
    Promise.resolve(parseCallbackListFilterFromUrl(params)),
  ]);

  return (
    <CallbackRequestManagement
      items={items}
      counts={counts}
      initialListFilter={initialListFilter}
    />
  );
}

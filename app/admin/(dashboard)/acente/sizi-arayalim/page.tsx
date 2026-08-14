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
  const initialListFilter = parseCallbackListFilterFromUrl(params);
  const listFilterKey =
    typeof params.durum === "string"
      ? params.durum
      : Array.isArray(params.durum)
        ? (params.durum[0] ?? "")
        : "";

  const [items, counts] = await Promise.all([
    getAllCallbackRequests(),
    getCallbackRequestCounts(),
  ]);

  return (
    <CallbackRequestManagement
      items={items}
      counts={counts}
      initialListFilter={initialListFilter}
      listFilterKey={listFilterKey}
    />
  );
}

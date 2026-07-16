import CallbackRequestManagement from "@/components/admin/callback-requests/CallbackRequestManagement";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  getAllCallbackRequests,
  getCallbackRequestCounts,
} from "@/lib/queries/callback-requests";

export const dynamic = "force-dynamic";

export default async function SiziArayalimPage() {
  await requireAdmin();
  const [items, counts] = await Promise.all([
    getAllCallbackRequests(),
    getCallbackRequestCounts(),
  ]);

  return <CallbackRequestManagement items={items} counts={counts} />;
}

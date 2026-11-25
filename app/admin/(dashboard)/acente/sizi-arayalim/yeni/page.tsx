import CallbackRequestForm from "@/components/admin/callback-requests/CallbackRequestForm";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function SiziArayalimCreatePage() {
  await requireAdmin();
  return <CallbackRequestForm />;
}

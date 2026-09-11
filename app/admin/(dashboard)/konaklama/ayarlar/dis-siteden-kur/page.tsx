import ExternalVillaSetupForm from "@/components/admin/konaklama/ExternalVillaSetupForm";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function ExternalVillaSetupPage() {
  await requireAdmin();
  return <ExternalVillaSetupForm />;
}

import { notFound } from "next/navigation";
import CallbackRequestForm from "@/components/admin/callback-requests/CallbackRequestForm";
import { requireAdmin } from "@/lib/auth-helpers";
import { getCallbackRequestById } from "@/lib/queries/callback-requests";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function SiziArayalimDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const item = await getCallbackRequestById(id);
  if (!item) notFound();

  return <CallbackRequestForm item={item} />;
}

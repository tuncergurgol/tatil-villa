import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ mail?: string }>;
}

/** Eski ONAYLINK yolu → `/onay?rezId=` */
export default async function LegacyReservationConfirmRedirect({
  params,
  searchParams,
}: PageProps) {
  const { code } = await params;
  const { mail } = await searchParams;
  const qs = new URLSearchParams({ rezId: code.trim() });
  if (mail?.trim()) qs.set("mail", mail.trim());
  redirect(`/onay?${qs.toString()}`);
}

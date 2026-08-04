import { redirect } from "next/navigation";
import MemberAuthPanel from "@/components/member/MemberAuthPanel";
import { getCurrentMember } from "@/lib/member-session.server";

export const dynamic = "force-dynamic";

export default async function MemberLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ davet?: string }>;
}) {
  const member = await getCurrentMember();
  if (member) redirect("/uye/hesabim");

  const params = await searchParams;
  const inviteCode = params.davet?.trim() ?? "";

  return (
    <div className="min-h-[70vh] bg-slate-50 py-10 sm:py-16">
      <MemberAuthPanel inviteCode={inviteCode} />
    </div>
  );
}

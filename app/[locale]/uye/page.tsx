import { redirect } from "next/navigation";
import MemberAuthPanel from "@/components/member/MemberAuthPanel";
import { getCurrentMember } from "@/lib/member-session.server";

export const dynamic = "force-dynamic";

export default async function MemberLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ davet?: string; redirect?: string }>;
}) {
  const member = await getCurrentMember();
  const params = await searchParams;
  const redirectTo = params.redirect?.startsWith("/")
    ? params.redirect
    : "/uye/hesabim";

  if (member) redirect(redirectTo);

  const inviteCode = params.davet?.trim() ?? "";

  return (
    <div className="min-h-[70vh] bg-slate-50 py-10 sm:py-16">
      <MemberAuthPanel inviteCode={inviteCode} redirectTo={redirectTo} />
    </div>
  );
}

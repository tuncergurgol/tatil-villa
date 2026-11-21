import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import MemberAuthPanel from "@/components/member/MemberAuthPanel";
import { getCurrentMember } from "@/lib/member-session.server";
import { buildPublicAlternates } from "@/lib/i18n/hreflang";
import { NOINDEX_FOLLOW } from "@/lib/public-indexing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: "Üye Girişi",
    description:
      "Rezervasyonlarınızı görüntülemek ve üyelik işlemleri için giriş yapın.",
    robots: NOINDEX_FOLLOW,
    alternates: buildPublicAlternates(locale, "/uye"),
  };
}

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

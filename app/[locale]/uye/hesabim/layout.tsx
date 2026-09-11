import { redirect } from "next/navigation";
import MemberShell from "@/components/member/MemberShell";
import { getCurrentMember } from "@/lib/member-session.server";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await getCurrentMember();
  if (!member) redirect("/uye");

  return <MemberShell memberName={member.fullName}>{children}</MemberShell>;
}

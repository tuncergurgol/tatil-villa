import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/member-session.server";

export default async function MemberHomePage() {
  const member = await getCurrentMember();
  redirect(member ? "/uye/hesabim/profil" : "/uye");
}

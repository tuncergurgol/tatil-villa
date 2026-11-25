import { getCurrentMember } from "@/lib/member-session.server";
import MemberProfileForm from "@/components/member/MemberProfileForm";
import { resolveMemberContactProfile } from "@/lib/member-profile";

export default async function MemberProfilePage() {
  const member = await getCurrentMember();
  if (!member) return null;

  const profile = await resolveMemberContactProfile(member.id);

  return (
    <div className="space-y-6">
      <div className="hidden lg:block">
        <h2 className="text-xl font-bold text-slate-900">Kişisel Bilgiler</h2>
        <p className="mt-1 text-sm text-slate-600">
          Bilgileriniz üye hesabınız ve müşteri kaydınızla eşleştirilir; rezervasyon
          formlarında otomatik doldurulur.
        </p>
      </div>
      <MemberProfileForm
        member={{
          fullName: profile?.fullName || member.fullName,
          email: profile?.email || member.email,
          phone: profile?.phone || member.phone,
        }}
      />
    </div>
  );
}

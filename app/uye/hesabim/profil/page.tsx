import { getCurrentMember } from "@/lib/member-session.server";
import MemberProfileForm from "@/components/member/MemberProfileForm";

export default async function MemberProfilePage() {
  const member = await getCurrentMember();
  if (!member) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Kişisel Bilgiler</h2>
        <p className="mt-1 text-sm text-slate-600">
          İletişim bilgilerinizi güncelleyin ve şifrenizi değiştirin.
        </p>
      </div>
      <MemberProfileForm
        member={{
          fullName: member.fullName,
          email: member.email,
          phone: member.phone,
        }}
      />
    </div>
  );
}

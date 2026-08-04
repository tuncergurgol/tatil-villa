import { getCurrentMember } from "@/lib/member-session.server";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { getCompanySettings } from "@/lib/queries/company-settings";

export default async function MemberInvitePage() {
  const member = await getCurrentMember();
  if (!member) return null;

  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const inviteUrl = `https://${site.domain}/uye?davet=${member.inviteCode}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Davet Kodu</h2>
        <p className="mt-1 text-sm text-slate-600">
          Arkadaşlarınızı davet edin; ilk rezervasyonlarında 1.000 TL hoş geldin
          hediyesi kazansınlar, siz de konaklama tamamlandığında ödül alın.
        </p>
      </div>

      <div className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-5">
        <p className="text-sm font-semibold text-violet-800">Davet Kodunuz</p>
        <p className="mt-2 text-3xl font-bold tracking-[0.2em] text-slate-900">
          {member.inviteCode}
        </p>
        <p className="mt-4 break-all text-sm text-slate-700">{inviteUrl}</p>
      </div>

      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
        <li>Davet linkinizi paylaşın</li>
        <li>Arkadaşınız üye olup ilk rezervasyonunu yapsın</li>
        <li>Konaklaması tamamlandığında kupon bakiyeniz büyüsün</li>
      </ol>
    </div>
  );
}

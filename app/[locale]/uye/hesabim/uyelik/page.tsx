import { LOYALTY_TIER_META, LOYALTY_TIER_ORDER } from "@/lib/loyalty-config";
import { getCurrentMember } from "@/lib/member-session.server";
import { prisma } from "@/lib/db";

export default async function MemberLoyaltyPage() {
  const member = await getCurrentMember();
  if (!member) return null;

  const vouchers = await prisma.loyaltyVoucher.findMany({
    where: { memberId: member.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "asc" },
  });

  const currentMeta = LOYALTY_TIER_META[member.loyaltyTier];

  return (
    <div className="space-y-6">
      <div className="hidden lg:block">
        <h2 className="text-xl font-bold text-slate-900">Üyelik Seviyesi</h2>
        <p className="mt-1 text-sm text-slate-600">
          Tamamlanan konaklamalarınıza göre seviye ve sadakat çekleri kazanırsınız.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5">
        <p className="text-sm font-semibold text-amber-800">Mevcut Seviye</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">
          {currentMeta.emoji} {currentMeta.label}
        </p>
        <p className="mt-2 text-sm text-slate-600">{currentMeta.description}</p>
        <p className="mt-3 text-sm text-slate-700">
          Tamamlanan konaklama: <strong>{member.completedStays}</strong>
        </p>
        <p className="mt-1 text-sm text-slate-700">
          Kupon bakiyesi:{" "}
          <strong>{member.couponBalance.toLocaleString("tr-TR")} TL</strong>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {LOYALTY_TIER_ORDER.map((tier) => {
          const meta = LOYALTY_TIER_META[tier];
          const active = tier === member.loyaltyTier;
          return (
            <div
              key={tier}
              className={`rounded-2xl border px-4 py-4 ${
                active
                  ? "border-teal-300 bg-teal-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-lg font-bold text-slate-900">
                {meta.emoji} {meta.label}
              </p>
              <p className="mt-1 text-sm text-slate-600">{meta.description}</p>
              {meta.voucherPercent > 0 ? (
                <p className="mt-2 text-sm font-semibold text-teal-700">
                  %{meta.voucherPercent} sadakat çeki
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-900">Aktif Sadakat Çekleri</h3>
        {vouchers.length === 0 ? (
          <p className="mt-3 rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
            Henüz aktif çekiniz yok. Konaklamanız tamamlandığında seviyenize göre
            çek tanımlanır.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {vouchers.map((voucher) => (
              <li
                key={voucher.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm"
              >
                <span>
                  {voucher.remainingAmount.toLocaleString("tr-TR")} TL
                  {voucher.discountPercent
                    ? ` (%${voucher.discountPercent})`
                    : ""}
                </span>
                <span className="text-slate-500">
                  {voucher.expiresAt.toLocaleDateString("tr-TR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

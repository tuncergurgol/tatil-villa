"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LoyaltyTier, LoyaltyVoucherType } from "@prisma/client";
import {
  Award,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  X,
} from "lucide-react";
import {
  createManualLoyaltyVoucherAction,
  syncLoyaltyTiersAction,
} from "@/app/actions/admin/loyalty";
import {
  LOYALTY_RULES,
  LOYALTY_TIER_META,
  LOYALTY_TIER_ORDER,
} from "@/lib/loyalty-config";
import type {
  AdminLoyaltyMemberItem,
  AdminLoyaltyPageData,
  AdminLoyaltyVoucherItem,
} from "@/lib/queries/admin-loyalty";
import { formatStoredTurkishPhoneDisplay } from "@/lib/phone-utils";
import { includesSearchText } from "@/lib/search-text";

type TabId = "uyeler" | "cekler";
type TierFilter = "all" | LoyaltyTier;
type VoucherFilter = "active" | "used" | "expired" | "all";

const VOUCHER_TYPE_LABEL: Record<LoyaltyVoucherType, string> = {
  TIER_STAY: "Konaklama",
  REFERRAL_REWARD: "Davet",
  WELCOME: "Hoş geldin",
  MANUAL: "Manuel",
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

function formatMoney(value: number) {
  return `${value.toLocaleString("tr-TR")} TL`;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

function voucherStatus(voucher: AdminLoyaltyVoucherItem, now: Date) {
  if (voucher.usedAt) return "used" as const;
  if (voucher.expiresAt <= now) return "expired" as const;
  return "active" as const;
}

export default function LoyaltyProgramManagement({
  data,
}: {
  data: AdminLoyaltyPageData;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("uyeler");
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [voucherFilter, setVoucherFilter] = useState<VoucherFilter>("active");
  const [manualOpen, setManualOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("1000");
  const [validityDays, setValidityDays] = useState(
    String(LOYALTY_RULES.voucherValidityDays)
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const now = useMemo(() => new Date(), []);

  const filteredMembers = useMemo(() => {
    return data.members.filter((member) => {
      const matchesTier =
        tierFilter === "all" || member.loyaltyTier === tierFilter;
      const matchesSearch =
        !search.trim() ||
        includesSearchText(member.fullName, search) ||
        includesSearchText(member.phone, search) ||
        includesSearchText(member.email, search);
      return matchesTier && matchesSearch;
    });
  }, [data.members, search, tierFilter]);

  const filteredVouchers = useMemo(() => {
    return data.vouchers.filter((voucher) => {
      const status = voucherStatus(voucher, now);
      const matchesStatus =
        voucherFilter === "all" || status === voucherFilter;
      const matchesSearch =
        !search.trim() ||
        includesSearchText(voucher.memberName, search) ||
        includesSearchText(voucher.memberPhone, search) ||
        includesSearchText(voucher.bookingCode ?? "", search);
      return matchesStatus && matchesSearch;
    });
  }, [data.vouchers, now, search, voucherFilter]);

  function runSync() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await syncLoyaltyTiersAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Senkron tamamlandı");
      router.refresh();
    });
  }

  function submitManual(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("amount", amount);
    formData.set("validityDays", validityDays);
    startTransition(async () => {
      const result = await createManualLoyaltyVoucherAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Çek oluşturuldu");
      setManualOpen(false);
      setMemberId("");
      setAmount("1000");
      router.refresh();
    });
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden lg:h-[calc(100dvh-4rem)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Sadakat Programı
              </h1>
              <p className="text-sm text-gray-500">
                Üyelik sınıfları (Bronz–Platin), çekler ve davet kuralları —
                müşteri listesindeki üyelik ile aynı sınıflandırma
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runSync}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${pending ? "animate-spin" : ""}`}
              />
              Seviye Senkron
            </button>
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Manuel Çek
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {message}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Üye"
              value={String(data.stats.activeMemberCount)}
              hint={`${data.stats.memberCount} toplam üye`}
            />
            <StatCard
              label="Aktif çek"
              value={String(data.stats.activeVoucherCount)}
              hint={formatMoney(data.stats.activeVoucherTotal)}
            />
            <StatCard
              label="Kupon bakiyesi"
              value={formatMoney(data.stats.couponBalanceTotal)}
              hint="Davet ödülü bakiyesi"
            />
            <StatCard
              label="Çek geçerliliği"
              value={`${LOYALTY_RULES.voucherValidityDays} gün`}
              hint={`Davet ödülü ${LOYALTY_RULES.referralRewardAmount.toLocaleString("tr-TR")} TL`}
            />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Üyelik Sınıfları
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {LOYALTY_TIER_ORDER.map((tier) => {
                const meta = LOYALTY_TIER_META[tier];
                return (
                  <div
                    key={tier}
                    className="rounded-2xl border border-gray-200 bg-gray-50/60 px-4 py-4"
                  >
                    <p className="text-lg font-bold text-gray-900">
                      {meta.emoji} {meta.label}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {meta.requiredStays === 0
                        ? "Başlangıç"
                        : `${meta.requiredStays}+ konaklama`}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-teal-700">
                      %{meta.voucherPercent} sadakat çeki
                    </p>
                    <p className="mt-3 text-xs text-gray-500">
                      {data.stats.tierCounts[tier]} üye
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3">
            {(
              [
                { id: "uyeler", label: "Üyeler" },
                { id: "cekler", label: "Sadakat Çekleri" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tab === item.id
                    ? "bg-teal-700 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="relative ml-auto min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ad, telefon, e-posta..."
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          {tab === "uyeler" ? (
            <>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "all", label: "Üyelik: Tümü" },
                    ...LOYALTY_TIER_ORDER.map((tier) => ({
                      value: tier,
                      label: LOYALTY_TIER_META[tier].label,
                    })),
                  ] as { value: TierFilter; label: string }[]
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTierFilter(option.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      tierFilter === option.value
                        ? "bg-amber-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Üye</th>
                      <th className="px-4 py-3">Üyelik Sınıfı</th>
                      <th className="px-4 py-3">Konaklama</th>
                      <th className="px-4 py-3">Aktif çek</th>
                      <th className="px-4 py-3">Kupon bakiye</th>
                      <th className="px-4 py-3">Son konaklama</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredMembers.map((member) => (
                      <MemberRow key={member.id} member={member} />
                    ))}
                  </tbody>
                </table>
                {filteredMembers.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-gray-500">
                    Üye bulunamadı.
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "active", label: "Aktif" },
                    { value: "used", label: "Kullanılmış" },
                    { value: "expired", label: "Süresi dolmuş" },
                    { value: "all", label: "Tümü" },
                  ] as { value: VoucherFilter; label: string }[]
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setVoucherFilter(option.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      voucherFilter === option.value
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Üye</th>
                      <th className="px-4 py-3">Tutar</th>
                      <th className="px-4 py-3">Tür</th>
                      <th className="px-4 py-3">Durum</th>
                      <th className="px-4 py-3">Son geçerlilik</th>
                      <th className="px-4 py-3">Rezervasyon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredVouchers.map((voucher) => (
                      <VoucherRow
                        key={voucher.id}
                        voucher={voucher}
                        now={now}
                      />
                    ))}
                  </tbody>
                </table>
                {filteredVouchers.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-gray-500">
                    Çek bulunamadı.
                  </p>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      {manualOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submitManual}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Manuel Çek</h2>
              </div>
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-3 block">
              <span className="mb-1.5 block text-xs font-medium text-gray-500">
                Üye
              </span>
              <select
                required
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
                className={inputClass}
              >
                <option value="">Seçin</option>
                {data.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName} ·{" "}
                    {formatStoredTurkishPhoneDisplay(member.phone)} ·{" "}
                    {LOYALTY_TIER_META[member.loyaltyTier].label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mb-3 block">
              <span className="mb-1.5 block text-xs font-medium text-gray-500">
                Tutar (TL)
              </span>
              <input
                required
                type="number"
                min={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={inputClass}
              />
            </label>

            <label className="mb-5 block">
              <span className="mb-1.5 block text-xs font-medium text-gray-500">
                Geçerlilik (gün)
              </span>
              <input
                required
                type="number"
                min={1}
                max={730}
                value={validityDays}
                onChange={(event) => setValidityDays(event.target.value)}
                className={inputClass}
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Oluştur
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}

function MemberRow({ member }: { member: AdminLoyaltyMemberItem }) {
  const meta = LOYALTY_TIER_META[member.loyaltyTier];
  return (
    <tr className="hover:bg-gray-50/80">
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-900">{member.fullName}</p>
        <p className="text-xs text-gray-500">
          {formatStoredTurkishPhoneDisplay(member.phone)}
          {member.email ? ` · ${member.email}` : ""}
        </p>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          {meta.emoji} {meta.label}
        </span>
        {!member.active ? (
          <span className="ml-2 text-xs text-gray-400">Pasif</span>
        ) : null}
      </td>
      <td className="px-4 py-3 text-gray-700">{member.completedStays}</td>
      <td className="px-4 py-3 text-gray-700">
        {member.activeVoucherCount > 0
          ? `${member.activeVoucherCount} · ${formatMoney(member.activeVoucherTotal)}`
          : "-"}
      </td>
      <td className="px-4 py-3 text-gray-700">
        {member.couponBalance > 0 ? formatMoney(member.couponBalance) : "-"}
      </td>
      <td className="px-4 py-3 text-gray-700">
        {formatDate(member.lastStayCompletedAt)}
      </td>
    </tr>
  );
}

function VoucherRow({
  voucher,
  now,
}: {
  voucher: AdminLoyaltyVoucherItem;
  now: Date;
}) {
  const status = voucherStatus(voucher, now);
  const statusLabel =
    status === "active"
      ? "Aktif"
      : status === "used"
        ? "Kullanılmış"
        : "Süresi dolmuş";
  const statusClass =
    status === "active"
      ? "bg-emerald-50 text-emerald-700"
      : status === "used"
        ? "bg-slate-100 text-slate-600"
        : "bg-rose-50 text-rose-700";

  return (
    <tr className="hover:bg-gray-50/80">
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-900">{voucher.memberName}</p>
        <p className="text-xs text-gray-500">
          {formatStoredTurkishPhoneDisplay(voucher.memberPhone)}
        </p>
      </td>
      <td className="px-4 py-3 text-gray-700">
        {formatMoney(voucher.remainingAmount)}
        {voucher.remainingAmount !== voucher.amount ? (
          <span className="text-xs text-gray-400">
            {" "}
            / {formatMoney(voucher.amount)}
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3 text-gray-700">
        {VOUCHER_TYPE_LABEL[voucher.type]}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}
        >
          {statusLabel}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-700">
        {formatDate(voucher.expiresAt)}
      </td>
      <td className="px-4 py-3 text-gray-700">{voucher.bookingCode ?? "-"}</td>
    </tr>
  );
}

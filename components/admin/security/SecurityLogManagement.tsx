"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import type { SecurityPageData } from "@/lib/queries/security";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function StatCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  tone?: "slate" | "emerald" | "rose" | "amber";
}) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default function SecurityLogManagement({
  data,
}: {
  data: SecurityPageData;
}) {
  const { summary, users, events, passwordResets } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Shield className="h-6 w-6 text-teal-700" />
            Güvenlik & Log
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Admin girişleri, şifre sıfırlama ve hesap özeti.
          </p>
        </div>
        <Link
          href="/admin/acente/kullanicilar"
          className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-100"
        >
          Kullanıcı yönetimi
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Aktif yönetici" value={summary.activeAdmins} tone="emerald" />
        <StatCard label="Pasif kullanıcı" value={summary.passiveUsers} />
        <StatCard
          label="24s başarılı giriş"
          value={summary.loginSuccess24h}
          tone="emerald"
        />
        <StatCard
          label="24s başarısız giriş"
          value={summary.loginFailure24h}
          tone="rose"
        />
        <StatCard
          label="24s şifre reset"
          value={summary.passwordReset24h}
          tone="amber"
        />
        <StatCard
          label="SMS OTP"
          value={summary.smsOtpEnabled ? "Açık" : "Kapalı"}
          tone={summary.smsOtpEnabled ? "emerald" : "slate"}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-bold text-gray-900">Son güvenlik olayları</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 font-semibold">Zaman</th>
                <th className="px-4 py-2 font-semibold">Olay</th>
                <th className="px-4 py-2 font-semibold">E-posta</th>
                <th className="px-4 py-2 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    Henüz kayıt yok. Yeni giriş denemeleri burada listelenir.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="border-t border-gray-100">
                    <td className="whitespace-nowrap px-4 py-2 text-gray-600">
                      {formatDate(event.createdAt)}
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {event.actionLabel}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{event.email || "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">
                      {event.ip || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">Admin hesapları</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-medium text-gray-700">{user.role}</p>
                  <p className={user.active ? "text-emerald-700" : "text-rose-600"}>
                    {user.active ? "Aktif" : "Pasif"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">
              Şifre sıfırlama talepleri
            </h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {passwordResets.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-gray-500">
                Kayıt yok.
              </li>
            ) : (
              passwordResets.map((item) => (
                <li key={item.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-900">{item.phone}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.channel} ·{" "}
                    {item.usedAt
                      ? `Kullanıldı ${formatDate(item.usedAt)}`
                      : item.expiresAt < new Date()
                        ? "Süresi doldu"
                        : "Bekliyor"}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

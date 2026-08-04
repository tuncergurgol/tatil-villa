"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gift,
  KeyRound,
  LogOut,
  Ticket,
  UserRound,
} from "lucide-react";
import { logoutMemberAction } from "@/app/actions/member-auth";

const navItems = [
  { href: "/uye/hesabim/profil", label: "Kişisel Bilgiler", icon: UserRound },
  {
    href: "/uye/hesabim/rezervasyonlar",
    label: "Rezervasyonlarım",
    icon: Ticket,
  },
  { href: "/uye/hesabim/uyelik", label: "Üyelik Seviyesi", icon: Gift },
  { href: "/uye/hesabim/davet", label: "Davet Kodu", icon: KeyRound },
];

export default function MemberShell({
  children,
  memberName,
}: {
  children: React.ReactNode;
  memberName: string;
}) {
  const pathname = usePathname();

  async function handleLogout() {
    await logoutMemberAction();
    window.location.href = "/uye";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
            Üye Paneli
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            Merhaba, {memberName}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "border-teal-300 bg-teal-50 text-teal-800"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </aside>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {children}
        </section>
      </div>
    </div>
  );
}

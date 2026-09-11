"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { ChevronRight, Home, LogOut } from "lucide-react";
import { logoutMemberAction } from "@/app/actions/member-auth";
import {
  memberAccountNavItems,
  memberHomeNavItem,
} from "@/lib/member-nav";

function MenuTile({
  href,
  label,
  description,
  icon: Icon,
}: {
  href: string;
  label: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-3 py-4 text-center shadow-sm transition active:scale-[0.98] active:bg-teal-50"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-xs font-semibold leading-tight text-slate-800">
        {label}
      </span>
      {description ? (
        <span className="line-clamp-1 text-[10px] font-medium text-slate-500">
          {description}
        </span>
      ) : null}
    </Link>
  );
}

export default function MemberMobileMenu({
  memberName,
}: {
  memberName: string;
}) {
  async function handleLogout() {
    await logoutMemberAction();
    window.location.href = "/uye";
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-[calc(4.75rem+env(safe-area-inset-bottom))]">
      <div className="border-b border-slate-200/80 bg-white px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
          Üye Paneli
        </p>
        <h1 className="mt-0.5 text-xl font-bold text-slate-900">Hesabım</h1>
        <p className="mt-1 text-sm text-slate-600">Merhaba, {memberName}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {memberAccountNavItems.map((item) => (
            <MenuTile
              key={item.href}
              href={item.href}
              label={item.label}
              description={item.description}
              icon={item.icon}
            />
          ))}
        </div>

        <Link
          href={memberHomeNavItem.href}
          className="mt-3 flex w-full items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 text-left shadow-sm transition active:bg-teal-50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-teal-700">
            <Home className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">
            Ana Sayfa
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        </Link>
      </div>

      <div className="border-t border-slate-200/80 bg-white px-4 py-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition active:bg-slate-50"
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}

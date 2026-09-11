"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { logoutMemberAction } from "@/app/actions/member-auth";
import MemberMobileBottomBar from "@/components/member/MemberMobileBottomBar";
import MemberMobileMenu from "@/components/member/MemberMobileMenu";
import {
  getMemberPageTitle,
  isMemberAccountSubPath,
  isMemberHubPath,
  memberAccountNavItems,
  memberHomeNavItem,
} from "@/lib/member-nav";

export default function MemberShell({
  children,
  memberName,
}: {
  children: React.ReactNode;
  memberName: string;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const onHub = isMemberHubPath(pathname);
  const onSubPage = isMemberAccountSubPath(pathname);
  const pageTitle = getMemberPageTitle(pathname);

  useEffect(() => {
    if (!onHub) return;
    const media = window.matchMedia("(min-width: 1024px)");
    const redirectDesktop = () => {
      if (media.matches) {
        router.replace("/uye/hesabim/profil");
      }
    };
    redirectDesktop();
    media.addEventListener("change", redirectDesktop);
    return () => media.removeEventListener("change", redirectDesktop);
  }, [onHub, router]);

  async function handleLogout() {
    await logoutMemberAction();
    window.location.href = "/uye";
  }

  return (
    <>
      <div className="lg:hidden">
        <div className="flex min-h-[calc(100dvh-4.5rem)] flex-col bg-slate-50">
          {onHub ? (
            <MemberMobileMenu memberName={memberName} />
          ) : (
            <>
              {onSubPage && pageTitle ? (
                <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                    Üye Paneli
                  </p>
                  <h1 className="mt-0.5 text-lg font-bold text-slate-900">
                    {pageTitle}
                  </h1>
                </div>
              ) : null}
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))]">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  {children}
                </div>
              </div>
            </>
          )}
        </div>
        <MemberMobileBottomBar />
      </div>

      <div className="mx-auto hidden max-w-6xl px-4 py-8 sm:px-6 lg:block">
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
            <Link
              href={memberHomeNavItem.href}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              <memberHomeNavItem.icon className="h-4 w-4" />
              {memberHomeNavItem.label}
            </Link>
            {memberAccountNavItems.map((item) => {
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
    </>
  );
}

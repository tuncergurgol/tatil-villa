"use client";

import { ArrowLeft, LayoutGrid } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { isMemberHubPath } from "@/lib/member-nav";

export default function MemberMobileBottomBar() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const onHub = isMemberHubPath(pathname);

  function goMenu() {
    router.push("/uye/hesabim");
  }

  function goBack() {
    if (onHub) {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
        return;
      }
      router.push("/");
      return;
    }

    router.push("/uye/hesabim");
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
      aria-label="Üye paneli navigasyonu"
    >
      <div className="mx-auto grid max-w-lg grid-cols-2 gap-2 px-3 py-2">
        <button
          type="button"
          onClick={goMenu}
          disabled={onHub}
          className="inline-flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl bg-teal-600 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm transition active:bg-teal-700 disabled:cursor-default disabled:opacity-55"
        >
          <LayoutGrid className="h-5 w-5" />
          Menü
        </button>
        <button
          type="button"
          onClick={goBack}
          className="inline-flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-700 shadow-sm transition active:bg-slate-50"
        >
          <ArrowLeft className="h-5 w-5" />
          Geri
        </button>
      </div>
    </nav>
  );
}

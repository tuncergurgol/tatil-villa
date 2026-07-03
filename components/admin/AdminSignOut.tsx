"use client";

import { LogOut } from "lucide-react";
import { adminSignOut } from "@/app/actions/admin/auth";

export default function AdminSignOut() {
  return (
    <form action={adminSignOut}>
      <button
        type="submit"
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-teal-200 transition hover:bg-white/10 hover:text-white"
      >
        <LogOut className="h-4 w-4" />
        Çıkış Yap
      </button>
    </form>
  );
}

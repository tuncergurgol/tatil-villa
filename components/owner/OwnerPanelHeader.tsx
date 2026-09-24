"use client";

import { LogOut } from "lucide-react";
import { adminSignOut } from "@/app/actions/admin/auth";

export default function OwnerPanelHeader({ name }: { name: string }) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <p className="text-xs font-semibold tracking-wide text-teal-700 uppercase">
            Villa sahibi paneli
          </p>
          <p className="text-sm font-medium text-gray-900">{name}</p>
        </div>
        <form action={adminSignOut}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            Çıkış
          </button>
        </form>
      </div>
    </header>
  );
}

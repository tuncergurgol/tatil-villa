"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  resetAdminPasswordAction,
  type AdminAuthActionState,
} from "@/app/actions/admin/admin-auth";

const initialState: AdminAuthActionState = {};

export default function AdminResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    resetAdminPasswordAction,
    initialState
  );

  if (state.success) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
          {state.message}
        </div>
        <Link
          href="/admin/login"
          className="inline-flex w-full justify-center rounded-xl bg-teal-600 py-3 text-sm font-bold text-white hover:bg-teal-700"
        >
          Giriş Yap
        </Link>
      </div>
    );
  }

  if (!token.trim()) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Geçersiz şifre sıfırlama bağlantısı.
        </div>
        <Link
          href="/admin/login/sifremi-unuttum"
          className="text-sm font-semibold text-teal-700 hover:text-teal-800"
        >
          Yeni bağlantı iste
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {state.error ? (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <label className="block">
        <span className="text-sm font-medium text-gray-700">Yeni şifre</span>
        <input
          type="password"
          name="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-700">
          Yeni şifre (tekrar)
        </span>
        <input
          type="password"
          name="passwordConfirm"
          required
          minLength={6}
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-teal-600 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {pending ? "Kaydediliyor..." : "Şifreyi Güncelle"}
      </button>
    </form>
  );
}

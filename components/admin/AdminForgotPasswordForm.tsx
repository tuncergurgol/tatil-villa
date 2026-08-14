"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestAdminPasswordResetAction,
  type AdminAuthActionState,
} from "@/app/actions/admin/admin-auth";

const initialState: AdminAuthActionState = {};

export default function AdminForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    requestAdminPasswordResetAction,
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
          className="inline-flex text-sm font-semibold text-teal-700 hover:text-teal-800"
        >
          Giriş sayfasına dön
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <p className="text-sm text-gray-600">
        Kayıtlı e-posta adresinize şifre sıfırlama bağlantısı gönderilir.
      </p>

      <label className="block">
        <span className="text-sm font-medium text-gray-700">E-posta</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="ornek@firma.com"
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-teal-600 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {pending ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
      </button>

      <Link
        href="/admin/login"
        className="inline-flex text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        Giriş sayfasına dön
      </Link>
    </form>
  );
}

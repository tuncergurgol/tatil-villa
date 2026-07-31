"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

type Props = {
  idleMessage?: string;
};

export default function AdminLoginForm({ idleMessage }: Props) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const result = await Promise.race([
      signIn("credentials", {
        email,
        password,
        redirect: false,
      }),
      new Promise<{ error: string }>((resolve) =>
        setTimeout(
          () =>
            resolve({
              error: "Sunucu yanıt vermedi. Lütfen tekrar deneyin.",
            }),
          25_000
        )
      ),
    ]);

    setPending(false);

    if (result?.error) {
      setError(
        result.error === "CredentialsSignin"
          ? "E-posta veya şifre hatalı"
          : result.error
      );
      return;
    }

    window.location.assign("/admin");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {idleMessage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {idleMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <label className="block">
        <span className="text-sm font-medium text-gray-700">E-posta</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          placeholder="ornek@firma.com"
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-gray-700">Şifre</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
        />
      </label>

      <div className="text-right">
        <Link
          href="/admin/login/sifremi-unuttum"
          className="text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          Şifremi unuttum
        </Link>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-teal-600 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
      </button>
    </form>
  );
}

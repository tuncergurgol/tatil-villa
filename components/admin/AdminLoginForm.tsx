"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  resendAdminLoginOtpAction,
  startAdminLoginAction,
  type AdminAuthActionState,
} from "@/app/actions/admin/admin-auth";

const initialState: AdminAuthActionState = {};

type Props = {
  idleMessage?: string;
};

export default function AdminLoginForm({ idleMessage }: Props) {
  const router = useRouter();
  const [startState, startAction, startPending] = useActionState(
    startAdminLoginAction,
    initialState
  );
  const [resendState, resendAction, resendPending] = useActionState(
    resendAdminLoginOtpAction,
    initialState
  );

  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const passwordRef = useRef("");
  const [otpSession, setOtpSession] = useState<{
    email: string;
    password: string;
    phone: string;
    verificationId: string;
    channel?: "sms" | "whatsapp";
    hint?: string;
  } | null>(null);
  const [signInError, setSignInError] = useState("");
  const [signInPending, setSignInPending] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (
      startState.needsVerification &&
      startState.verificationId &&
      startState.phone &&
      startState.email
    ) {
      setOtpSession({
        email: startState.email,
        password: passwordRef.current,
        phone: startState.phone,
        verificationId: startState.verificationId,
        channel: startState.channel,
        hint: startState.message,
      });
    }
  }, [startState]);

  useEffect(() => {
    if (
      resendState.needsVerification &&
      resendState.verificationId &&
      resendState.phone &&
      resendState.email
    ) {
      setOtpSession({
        email: resendState.email,
        password: passwordRef.current,
        phone: resendState.phone,
        verificationId: resendState.verificationId,
        channel: resendState.channel,
        hint: resendState.message,
      });
    }
  }, [resendState]);

  useEffect(() => {
    if (otpSession) {
      codeInputRef.current?.focus();
    }
  }, [otpSession?.verificationId]);

  async function handleOtpSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!otpSession) return;

    setSignInPending(true);
    setSignInError("");

    const formData = new FormData(e.currentTarget);
    const otpCode = String(formData.get("otpCode") ?? "").trim();

    const result = await signIn("credentials", {
      email: otpSession.email,
      password: otpSession.password,
      otpCode,
      verificationId: otpSession.verificationId,
      redirect: false,
    });

    setSignInPending(false);

    if (result?.error) {
      setSignInError("Doğrulama kodu hatalı veya süresi doldu");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  if (otpSession) {
    const error =
      signInError || startState.error || resendState.error || undefined;

    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          <p className="font-semibold">WhatsApp doğrulama</p>
          <p className="mt-1 text-teal-800/90">
            {otpSession.hint ||
              `5 haneli kod ${
                otpSession.channel === "sms" ? "SMS" : "WhatsApp"
              } ile gönderildi.`}
          </p>
        </div>

        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Doğrulama kodu
            </span>
            <input
              ref={codeInputRef}
              name="otpCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={5}
              required
              placeholder="•••••"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-center text-lg font-bold tracking-[0.35em] outline-none focus:border-teal-500"
            />
          </label>

          {error ? (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={signInPending}
            className="w-full rounded-xl bg-teal-600 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {signInPending ? "Giriş yapılıyor..." : "Doğrula ve Giriş Yap"}
          </button>
        </form>

        <form action={resendAction} className="flex items-center justify-between">
          <input type="hidden" name="email" value={otpSession.email} />
          <input type="hidden" name="password" value={otpSession.password} />
          <button
            type="button"
            onClick={() => setOtpSession(null)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Geri dön
          </button>
          <button
            type="submit"
            disabled={resendPending}
            className="text-sm font-semibold text-teal-700 hover:text-teal-800 disabled:opacity-60"
          >
            {resendPending ? "Gönderiliyor…" : "Kodu tekrar gönder"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form
      action={startAction}
      onSubmit={(event) => {
        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "");
        const password = String(formData.get("password") ?? "");
        passwordRef.current = password;
        setCredentials({ email, password });
      }}
      className="space-y-4"
    >
      {idleMessage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {idleMessage}
        </div>
      ) : null}

      {startState.error ? (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {startState.error}
        </div>
      ) : null}

      <label className="block">
        <span className="text-sm font-medium text-gray-700">E-posta</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          defaultValue={credentials.email}
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
        disabled={startPending}
        className="w-full rounded-xl bg-teal-600 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {startPending ? "Kod gönderiliyor..." : "Giriş Yap"}
      </button>
    </form>
  );
}

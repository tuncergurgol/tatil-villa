"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  resendBookingGuestLoginOtpAction,
  startBookingGuestLoginAction,
  verifyBookingGuestLoginAction,
  type BookingGuestLoginState,
} from "@/app/actions/booking-guest-login";

const initialState: BookingGuestLoginState = {};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#e85d04] focus:ring-2 focus:ring-[#e85d04]/20";

export default function BookingGuestLoginForm() {
  const router = useRouter();
  const [startState, startAction, startPending] = useActionState(
    startBookingGuestLoginAction,
    initialState
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyBookingGuestLoginAction,
    initialState
  );
  const [resendState, resendAction, resendPending] = useActionState(
    resendBookingGuestLoginOtpAction,
    initialState
  );

  const [otpSession, setOtpSession] = useState<{
    phone: string;
    verificationId: string;
    channel?: "sms" | "whatsapp";
    hint?: string;
  } | null>(null);

  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (
      startState.needsVerification &&
      startState.phone &&
      startState.verificationId
    ) {
      setOtpSession({
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
      resendState.phone &&
      resendState.verificationId
    ) {
      setOtpSession({
        phone: resendState.phone,
        verificationId: resendState.verificationId,
        channel: resendState.channel,
        hint: resendState.message,
      });
    }
  }, [resendState]);

  useEffect(() => {
    if (verifyState.needsVerification && verifyState.verificationId) {
      setOtpSession((prev) =>
        prev
          ? {
              ...prev,
              verificationId: verifyState.verificationId!,
              phone: verifyState.phone || prev.phone,
              channel: verifyState.channel || prev.channel,
            }
          : prev
      );
    }
  }, [verifyState]);

  useEffect(() => {
    if (otpSession) {
      codeInputRef.current?.focus();
    }
  }, [otpSession?.verificationId]);

  useEffect(() => {
    if (verifyState.success && verifyState.redirectTo) {
      router.push(verifyState.redirectTo);
    }
  }, [verifyState.success, verifyState.redirectTo, router]);

  if (verifyState.success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-8 text-center">
        <p className="text-lg font-bold text-emerald-900">Doğrulama başarılı</p>
        <p className="mt-2 text-sm text-emerald-800/80">
          Giriş bilgilendirme sayfasına yönlendiriliyorsunuz…
        </p>
      </div>
    );
  }

  if (otpSession) {
    const error = verifyState.error || resendState.error || undefined;
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[#e85d04]/20 bg-[#fff8f0] px-4 py-3 text-sm text-slate-800">
          <p className="font-semibold">WhatsApp doğrulama</p>
          <p className="mt-1 text-slate-600">
            {otpSession.hint ||
              `5 haneli kod ${
                otpSession.channel === "sms" ? "SMS" : "WhatsApp"
              } ile gönderildi.`}
          </p>
        </div>

        <form action={verifyAction} className="space-y-4">
          <input
            type="hidden"
            name="verificationId"
            value={otpSession.verificationId}
          />
          <input type="hidden" name="phone" value={otpSession.phone} />
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">
              Doğrulama kodu
            </span>
            <input
              ref={codeInputRef}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={5}
              required
              placeholder="•••••"
              className={`${fieldClass} tracking-[0.4em] text-center text-xl font-bold`}
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={verifyPending}
            className="w-full rounded-xl bg-[#e85d04] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#e85d04]/25 transition hover:bg-[#d9480f] disabled:opacity-60"
          >
            {verifyPending ? "Doğrulanıyor…" : "Giriş Yap"}
          </button>
        </form>

        <form
          action={resendAction}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <input
            type="hidden"
            name="verificationId"
            value={otpSession.verificationId}
          />
          <input type="hidden" name="phone" value={otpSession.phone} />
          <button
            type="button"
            onClick={() => setOtpSession(null)}
            className="text-sm font-medium text-slate-500 underline-offset-2 hover:underline"
          >
            Bilgileri düzenle
          </button>
          <button
            type="submit"
            disabled={resendPending}
            className="text-sm font-semibold text-[#e85d04] hover:text-[#d9480f] disabled:opacity-60"
          >
            {resendPending ? "Gönderiliyor…" : "Kodu tekrar gönder"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={startAction} className="space-y-4">
      <label className="block">
        <span className="text-sm font-semibold text-slate-800">
          E-Posta Adresiniz
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="ornek@email.com"
          className={fieldClass}
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-800">
          Rezervasyon Kodu
        </span>
        <input
          type="text"
          name="reservationCode"
          required
          inputMode="numeric"
          autoComplete="off"
          placeholder="XXXXX"
          className={fieldClass}
        />
      </label>

      {startState.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {startState.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={startPending}
        className="w-full rounded-xl bg-[#e85d04] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#e85d04]/25 transition hover:bg-[#d9480f] disabled:opacity-60"
      >
        {startPending ? "Kod gönderiliyor…" : "Rezervasyonumu Göster"}
      </button>
    </form>
  );
}

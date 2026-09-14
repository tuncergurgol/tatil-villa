"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  resendCallbackRequestOtpAction,
  submitCallbackRequestAction,
  verifyCallbackRequestOtpAction,
  type CallbackRequestActionState,
} from "@/app/actions/callback-request";
import {
  CALLBACK_DAY_LABELS,
  CALLBACK_TIME_LABELS,
} from "@/lib/callback-request-labels";
import type {
  CallbackPreferredDay,
  CallbackPreferredTime,
} from "@prisma/client";
import TurkishPhoneField from "@/components/admin/ui/TurkishPhoneField";

const initialState: CallbackRequestActionState = {};

const fieldClass =
  "mt-1.5 w-full rounded-2xl border border-[#1a4a5c]/15 bg-white/90 px-4 py-3 text-sm text-[#0f2f3a] shadow-sm outline-none transition placeholder:text-[#1a4a5c]/40 focus:border-[#e85d04] focus:ring-2 focus:ring-[#e85d04]/20";

const chipBase =
  "rounded-full border px-3.5 py-2 text-xs font-semibold transition sm:text-sm";
const chipIdle =
  "border-[#1a4a5c]/15 bg-white text-[#1a4a5c]/80 hover:border-[#e85d04]/40 hover:text-[#e85d04]";
const chipActive =
  "border-[#e85d04] bg-[#fff4eb] text-[#c2410c] shadow-sm ring-1 ring-[#e85d04]/25";

type Props = {
  compact?: boolean;
  onSuccess?: () => void;
};

export default function CallbackRequestFormPublic({
  compact = false,
  onSuccess,
}: Props) {
  const [formState, formAction, formPending] = useActionState(
    submitCallbackRequestAction,
    initialState
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyCallbackRequestOtpAction,
    initialState
  );
  const [resendState, resendAction, resendPending] = useActionState(
    resendCallbackRequestOtpAction,
    initialState
  );

  const [preferredDay, setPreferredDay] =
    useState<CallbackPreferredDay>("ANY");
  const [preferredTime, setPreferredTime] =
    useState<CallbackPreferredTime>("ASAP");

  const [otpSession, setOtpSession] = useState<{
    phone: string;
    verificationId: string;
    channel?: "sms" | "whatsapp";
    hint?: string;
  } | null>(null);

  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (formState.needsVerification && formState.phone && formState.verificationId) {
      setOtpSession({
        phone: formState.phone,
        verificationId: formState.verificationId,
        channel: formState.channel,
        hint: formState.message,
      });
    }
  }, [formState]);

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
    if (verifyState.success) {
      onSuccess?.();
    }
  }, [verifyState.success, onSuccess]);

  if (verifyState.success) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-5 py-8 text-center">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-200/40 blur-2xl"
          aria-hidden
        />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white shadow-lg shadow-emerald-500/30">
          ✓
        </div>
        <p className="mt-4 text-lg font-bold text-emerald-900">
          {verifyState.message}
        </p>
        <p className="mt-2 text-sm text-emerald-800/80">
          Uzman ekibimiz çalışma saatlerinde sizi arayacak.
        </p>
      </div>
    );
  }

  if (otpSession) {
    const error = verifyState.error || resendState.error || undefined;
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#1a4a5c]/10 bg-[#fff8f0] px-4 py-3 text-sm text-[#0f2f3a]">
          <p className="font-semibold">Telefon doğrulama</p>
          <p className="mt-1 text-[#1a4a5c]/80">
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
            <span className="text-sm font-medium text-[#0f2f3a]">
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
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={verifyPending}
            className="w-full rounded-2xl bg-[#e85d04] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#e85d04]/25 transition hover:bg-[#d00000] disabled:opacity-60"
          >
            {verifyPending ? "Doğrulanıyor…" : "Kodu Doğrula"}
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
            className="text-sm font-medium text-[#1a4a5c]/70 underline-offset-2 hover:underline"
          >
            Formu düzenle
          </button>
          <button
            type="submit"
            disabled={resendPending}
            className="text-sm font-semibold text-[#e85d04] hover:text-[#d00000] disabled:opacity-60"
          >
            {resendPending ? "Gönderiliyor…" : "Kodu tekrar gönder"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="preferredDay" value={preferredDay} />
      <input type="hidden" name="preferredTime" value={preferredTime} />

      <TurkishPhoneField
        name="phone"
        label="Telefon numaranız"
        required
        focusPalette="teal"
        className="[&_div.relative]:mt-1.5"
      />

      <label className="block">
        <span className="text-sm font-medium text-[#0f2f3a]">Adınız</span>
        <input
          name="name"
          required
          autoComplete="name"
          placeholder="Adınız Soyadınız"
          className={fieldClass}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[#0f2f3a]">
          {compact ? "Kısa not (isteğe bağlı)" : "Tatil planınız"}
        </span>
        {compact ? (
          <input
            name="note"
            placeholder="Tarih / bölge / kişi sayısı…"
            className={fieldClass}
          />
        ) : (
          <textarea
            name="note"
            rows={3}
            placeholder="Tarih, bölge, kişi sayısı, özel istekleriniz…"
            className={fieldClass}
          />
        )}
      </label>

      <fieldset>
        <legend className="text-sm font-medium text-[#0f2f3a]">
          Ne zaman arayalım?
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            Object.entries(CALLBACK_DAY_LABELS) as [
              CallbackPreferredDay,
              string,
            ][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPreferredDay(value)}
              className={`${chipBase} ${
                preferredDay === value ? chipActive : chipIdle
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-[#0f2f3a]">
          Tercih edilen saat
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            Object.entries(CALLBACK_TIME_LABELS) as [
              CallbackPreferredTime,
              string,
            ][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPreferredTime(value)}
              className={`${chipBase} ${
                preferredTime === value ? chipActive : chipIdle
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-2.5 text-sm leading-snug text-[#1a4a5c]/85">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#1a4a5c]/30 text-[#e85d04] focus:ring-[#e85d04]"
        />
        <span>
          Formu göndererek tarafımızla iletişime geçilmesini ve doğrulama
          mesajı (WhatsApp/SMS) alınmasını kabul ediyorum.
        </span>
      </label>

      {formState.error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formState.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={formPending}
        className="w-full rounded-2xl bg-[#e85d04] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#e85d04]/25 transition hover:bg-[#d00000] hover:shadow-[#e85d04]/35 disabled:opacity-60"
      >
        {formPending ? "Kod gönderiliyor…" : "Beni Arayın"}
      </button>
      <p className="text-center text-xs text-[#1a4a5c]/55">
        Gönderim sonrası 5 haneli doğrulama kodu gelecek.
      </p>
    </form>
  );
}

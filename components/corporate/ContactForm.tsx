"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  sendContactMessageAction,
  type ContactActionState,
} from "@/app/actions/contact";
import TurkishPhoneField from "@/components/admin/ui/TurkishPhoneField";

const initialState: ContactActionState = {};

const inputClass =
  "w-full border-0 border-b border-slate-200 bg-transparent px-0 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600";

type ContactFormProps = {
  brandName: string;
};

export default function ContactForm({ brandName }: ContactFormProps) {
  const [state, formAction, isPending] = useActionState(
    sendContactMessageAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Bizimle iletişime geç!
        </h2>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          Size nasıl yardımcı olabiliriz?
        </p>
      </div>

      {state.error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}
      {state.success && state.message ? (
        <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <input
          name="firstName"
          required
          minLength={2}
          placeholder="Adınız*"
          className={inputClass}
          autoComplete="given-name"
        />
        <input
          name="lastName"
          required
          minLength={2}
          placeholder="Soyadınız*"
          className={inputClass}
          autoComplete="family-name"
        />
      </div>

      <input
        name="email"
        type="email"
        required
        placeholder="Mail Adresiniz*"
        className={inputClass}
        autoComplete="email"
      />

      <TurkishPhoneField
        name="phone"
        label="Telefon Numaranız"
        focusPalette="teal"
      />

      <textarea
        name="message"
        required
        minLength={10}
        rows={4}
        placeholder="Mesajınız*"
        className={`${inputClass} resize-y`}
      />

      <label className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600">
        <input
          type="checkbox"
          name="kvkkAccepted"
          required
          className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
        />
        <span>
          <Link
            href="/kurumsal/gizlilik-politikasi"
            target="_blank"
            className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800"
          >
            KVKK Aydınlatma metnini
          </Link>{" "}
          okudum.*
        </span>
      </label>

      <label className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600">
        <input
          type="checkbox"
          name="marketingOptIn"
          className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
        />
        <span>
          {brandName} tarafından haber ve kampanyalardan haberdar edilmek
          istiyorum.{" "}
          <Link
            href="/kurumsal/elektronik-ilet-ve-acik-riza-metni"
            target="_blank"
            className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800"
          >
            Detaylı Bilgi
          </Link>
        </span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-teal-700 px-6 py-3.5 text-sm font-bold tracking-wide text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[160px]"
      >
        {isPending ? "Gönderiliyor..." : "GÖNDER"}
      </button>
    </form>
  );
}

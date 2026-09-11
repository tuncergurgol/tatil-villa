"use client";

import { useActionState, useEffect } from "react";
import { KeyRound, X } from "lucide-react";
import {
  saveBiletallCredentials,
  type BiletallSettingsActionState,
} from "@/app/actions/admin/biletall-settings";
import { useRefreshOnActionSuccess } from "@/components/admin/AdminPageRefresh";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100";

type BiletallCredentialsModalProps = {
  open: boolean;
  username: string;
  hasPassword: boolean;
  onClose: () => void;
};

export default function BiletallCredentialsModal({
  open,
  username,
  hasPassword,
  onClose,
}: BiletallCredentialsModalProps) {
  const [state, formAction, pending] = useActionState<
    BiletallSettingsActionState,
    FormData
  >(saveBiletallCredentials, {});

  useRefreshOnActionSuccess(state.success);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        aria-hidden
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-sky-700">
              <KeyRound className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wide">
                Biletall hesabı
              </p>
            </div>
            <h2 className="mt-1 text-lg font-bold text-gray-900">
              Kullanıcı adı ve şifre
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Biletall iframe oturumu için acente giriş bilgilerinizi girin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={formAction} className="space-y-4 px-5 py-5">
          <div>
            <label
              htmlFor="biletallUsername"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Kullanıcı adı
            </label>
            <input
              id="biletallUsername"
              name="biletallUsername"
              defaultValue={username}
              placeholder="Biletall kullanıcı adı"
              className={inputClass}
              autoComplete="username"
            />
          </div>

          <div>
            <label
              htmlFor="biletallPassword"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Şifre
            </label>
            <input
              id="biletallPassword"
              name="biletallPassword"
              type="password"
              placeholder={hasPassword ? "Kayıtlı şifreyi değiştirmek için yazın" : "Biletall şifresi"}
              className={inputClass}
              autoComplete="new-password"
            />
            {hasPassword ? (
              <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  name="clearPassword"
                  className="size-4 rounded border-gray-300 text-sky-600 focus:ring-sky-200"
                />
                Kayıtlı şifreyi temizle
              </label>
            ) : null}
          </div>

          {state.error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Kaydediliyor…" : "Bilgileri kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

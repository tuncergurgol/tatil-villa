"use client";

import { useActionState, useState } from "react";
import { KeyRound } from "lucide-react";
import {
  saveBiletallSettings,
  type BiletallSettingsActionState,
} from "@/app/actions/admin/biletall-settings";
import BiletallCredentialsModal from "@/components/admin/obilet/BiletallCredentialsModal";
import BiletallRoutesEditor from "@/components/admin/obilet/BiletallRoutesEditor";
import type { BiletallRouteRecord } from "@/lib/biletall-routes";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100";

const initialState: BiletallSettingsActionState = {};

type ObiletSettingsFormProps = {
  biletallEnabled: boolean;
  biletallPortalSlug: string;
  biletallUsername: string;
  biletallHasPassword: boolean;
  biletallRoutes: BiletallRouteRecord[];
  publicOrigin: string;
};

export default function ObiletSettingsForm({
  biletallEnabled,
  biletallPortalSlug,
  biletallUsername,
  biletallHasPassword,
  biletallRoutes,
  publicOrigin,
}: ObiletSettingsFormProps) {
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    saveBiletallSettings,
    initialState
  );

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-orange-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
          Entegrasyonlar
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          Obilet / Biletall
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Biletall iframe portal ayarları. Public sayfalar{" "}
          <code className="rounded bg-sky-50 px-1.5 py-0.5 text-xs text-sky-800">
            /bilet/ara
          </code>
          ,{" "}
          <code className="rounded bg-sky-50 px-1.5 py-0.5 text-xs text-sky-800">
            /bilet/satinal
          </code>{" "}
          ve{" "}
          <code className="rounded bg-sky-50 px-1.5 py-0.5 text-xs text-sky-800">
            /bilet/sonuc
          </code>{" "}
          üzerinden gömülü çalışır.
        </p>
      </header>

      <form
        action={formAction}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Portal ayarları</h2>
            <p className="mt-1 text-sm text-gray-500">
              CRM Biletall entegrasyonundaki portal slug ile aynı olmalıdır.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCredentialsOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
          >
            <KeyRound className="h-4 w-4" />
            Biletall giriş bilgileri
          </button>
        </div>

        <div className="rounded-xl border border-gray-100 bg-slate-50/80 px-4 py-3 text-sm text-gray-600">
          <span className="font-medium text-gray-800">Kullanıcı adı:</span>{" "}
          {biletallUsername || "Tanımlı değil"}
          <span className="mx-2 text-gray-300">|</span>
          <span className="font-medium text-gray-800">Şifre:</span>{" "}
          {biletallHasPassword ? "Kayıtlı" : "Tanımlı değil"}
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <input
            type="checkbox"
            name="biletallEnabled"
            defaultChecked={biletallEnabled}
            className="size-4 rounded border-gray-300 text-sky-600 focus:ring-sky-200"
          />
          <span className="text-sm font-medium text-gray-800">
            Biletall entegrasyonu aktif
          </span>
        </label>

        <div>
          <label
            htmlFor="biletallPortalSlug"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Portal slug
          </label>
          <input
            id="biletallPortalSlug"
            name="biletallPortalSlug"
            defaultValue={biletallPortalSlug}
            placeholder="tatildeyizcomtr"
            className={inputClass}
            required
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Örnek iframe host:{" "}
            <span className="font-mono text-gray-700">
              iframe.biletall.com/portals/{"{slug}"}/UI/...
            </span>
          </p>
        </div>

        {state.error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Ayarlar kaydedildi.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </form>

      <BiletallRoutesEditor
        routes={biletallRoutes}
        portalSlug={biletallPortalSlug}
        username={biletallUsername}
        publicOrigin={publicOrigin}
      />

      <section className="rounded-2xl border border-sky-100 bg-sky-50/60 p-6">
        <h2 className="text-sm font-semibold text-sky-900">Biletall portal domain</h2>
        <p className="mt-1 text-sm text-sky-900/90">
          Iframe içindeki &quot;Ana Sayfaya Dön&quot; bağlantısı Biletall acente
          panelindeki site adresinden üretilir. Alan adı yalnızca{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">
            tatildeyiz.com.tr
          </code>{" "}
          veya{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">
            www.tatildeyiz.com.tr
          </code>{" "}
          olmalı; <strong>https://</strong> ile başlamamalı. Aksi halde iframe
          hatalı adrese yönlendirir.
        </p>
      </section>

      <section className="rounded-2xl border border-amber-100 bg-amber-50/50 p-6">
        <h2 className="text-sm font-semibold text-amber-900">CRM referans</h2>
        <p className="mt-1 text-sm text-amber-800/90">
          Kaynak panel:{" "}
          <a
            href="https://crm.tatildeyiz.com.tr/entegrasyonlar/biletall"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline decoration-amber-300 underline-offset-2 hover:text-amber-950"
          >
            crm.tatildeyiz.com.tr/entegrasyonlar/biletall
          </a>
          . Portal slug burada yönetilir; kullanıcı adı ve şifre bu panelden
          kaydedilir ve iframe oturumunda kullanılır.
        </p>
      </section>

      <BiletallCredentialsModal
        open={credentialsOpen}
        username={biletallUsername}
        hasPassword={biletallHasPassword}
        onClose={() => setCredentialsOpen(false)}
      />
    </div>
  );
}

"use client";

import { useActionState } from "react";
import {
  saveOtelzSettings,
  type OtelzSettingsActionState,
} from "@/app/actions/admin/otelz-settings";
import {
  OTELZ_DEFAULT_AFFILIATE,
  OTELZ_PUBLIC_ROUTE,
  OTELZ_SALES_PAGES,
  buildOtelzAffiliateUrl,
} from "@/lib/otelz";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100";

const initialState: OtelzSettingsActionState = {};

type OtelzSettingsFormProps = {
  otelzEnabled: boolean;
  otelzAffiliateTo: string;
  otelzAffiliateCid: string;
};

export default function OtelzSettingsForm({
  otelzEnabled,
  otelzAffiliateTo,
  otelzAffiliateCid,
}: OtelzSettingsFormProps) {
  const [state, formAction, pending] = useActionState(
    saveOtelzSettings,
    initialState
  );

  const affiliate = {
    to: otelzAffiliateTo.trim() || OTELZ_DEFAULT_AFFILIATE.to,
    cid: otelzAffiliateCid.trim() || OTELZ_DEFAULT_AFFILIATE.cid,
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
          Entegrasyonlar
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Otelz</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Otelz partner satış linkleri. Public sayfa{" "}
          <code className="rounded bg-sky-50 px-1.5 py-0.5 text-xs text-sky-800">
            {OTELZ_PUBLIC_ROUTE}
          </code>{" "}
          üzerinden affiliate bağlantıları ve banner gösterilir.
        </p>
      </header>

      <form
        action={formAction}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Genel ayarlar</h2>
          <p className="mt-1 text-sm text-gray-500">
            Partner panelindeki <strong>to</strong> ve <strong>cid</strong>{" "}
            parametreleri.
          </p>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3">
          <input
            type="checkbox"
            name="otelzEnabled"
            defaultChecked={otelzEnabled}
            className="size-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
          />
          <span className="text-sm font-medium text-gray-800">
            Otelz entegrasyonu aktif
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Affiliate to
            </span>
            <input
              name="otelzAffiliateTo"
              defaultValue={otelzAffiliateTo}
              placeholder={OTELZ_DEFAULT_AFFILIATE.to}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Affiliate cid
            </span>
            <input
              name="otelzAffiliateCid"
              defaultValue={otelzAffiliateCid}
              placeholder={OTELZ_DEFAULT_AFFILIATE.cid}
              className={inputClass}
            />
          </label>
        </div>

        {state.error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Ayarlar kaydedildi.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
        >
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </form>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Satış linkleri</h2>
        <p className="mt-1 text-sm text-gray-500">
          Partner panelindeki hazır linklerin mevcut ayarlarla üretilmiş hali.
        </p>
        <ul className="mt-4 space-y-3">
          {OTELZ_SALES_PAGES.map((page) => {
            const href = buildOtelzAffiliateUrl(page.path, affiliate);
            return (
              <li
                key={page.id}
                className="rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3"
              >
                <p className="text-sm font-semibold text-gray-900">{page.label}</p>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 break-all text-xs text-sky-700 hover:underline"
                >
                  {href}
                </a>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

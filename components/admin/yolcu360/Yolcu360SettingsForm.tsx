"use client";

import { useActionState, useState, useTransition } from "react";
import { KeyRound, PlugZap } from "lucide-react";
import {
  saveYolcu360Credentials,
  saveYolcu360Settings,
  testYolcu360SettingsAction,
  type Yolcu360SettingsActionState,
} from "@/app/actions/admin/yolcu360-settings";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100";

const initialState: Yolcu360SettingsActionState = {};

type Yolcu360SettingsFormProps = {
  settings: {
    enabled: boolean;
    publicEnabled: boolean;
    environment: string;
    apiKey: string;
    hasApiSecret: boolean;
    commissionType: string;
    commissionPercentage: number;
    defaultPaymentType: string;
  };
};

export default function Yolcu360SettingsForm({ settings }: Yolcu360SettingsFormProps) {
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [settingsState, settingsAction, settingsPending] = useActionState(
    saveYolcu360Settings,
    initialState
  );
  const [credentialsState, credentialsAction, credentialsPending] = useActionState(
    saveYolcu360Credentials,
    initialState
  );
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [isTesting, startTest] = useTransition();

  function handleTestConnection() {
    setTestMessage(null);
    startTest(async () => {
      const result = await testYolcu360SettingsAction();
      if (result.testOk) {
        setTestMessage("Bağlantı başarılı — JWT token alındı.");
        return;
      }
      setTestMessage(result.error ?? "Bağlantı testi başarısız.");
    });
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Entegrasyonlar
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Yolcu360</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Yolcu360 Agency API ile araç kiralama arama, rezervasyon ve ödeme akışı.
          Obilet/Biletall entegrasyonundan bağımsızdır. API anahtarlarını{" "}
          <a
            href="https://pro.yolcu360.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-700 underline"
          >
            pro.yolcu360.com
          </a>{" "}
          panelinden alın.
        </p>
      </header>

      <form action={settingsAction} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Genel ayarlar</h2>
            <p className="mt-1 text-sm text-gray-500">
              Staging ortamında rezervasyonlar gerçek değildir.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCredentialsOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <KeyRound className="h-4 w-4" />
              API anahtarları
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              <PlugZap className="h-4 w-4" />
              {isTesting ? "Test ediliyor…" : "Bağlantıyı test et"}
            </button>
          </div>
        </div>

        {testMessage ? (
          <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            {testMessage}
          </p>
        ) : null}

        <div className="rounded-xl border border-gray-100 bg-slate-50/80 px-4 py-3 text-sm text-gray-600">
          <span className="font-medium text-gray-800">API Key:</span>{" "}
          {settings.apiKey || "Tanımlı değil"}
          <span className="mx-2 text-gray-300">|</span>
          <span className="font-medium text-gray-800">Secret:</span>{" "}
          {settings.hasApiSecret ? "Kayıtlı" : "Tanımlı değil"}
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={settings.enabled}
            className="size-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-200"
          />
          <span className="text-sm font-medium text-gray-800">
            Yolcu360 entegrasyonu aktif
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <input
            type="checkbox"
            name="publicEnabled"
            defaultChecked={settings.publicEnabled}
            className="size-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-200"
          />
          <span className="text-sm font-medium text-gray-800">
            Public araç kiralama sayfasında Yolcu360 araması göster
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Ortam
            </span>
            <select
              name="environment"
              defaultValue={settings.environment}
              className={inputClass}
            >
              <option value="staging">Staging (test)</option>
              <option value="production">Production (canlı)</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Varsayılan ödeme tipi
            </span>
            <select
              name="defaultPaymentType"
              defaultValue={settings.defaultPaymentType}
              className={inputClass}
            >
              <option value="creditCard">Kredi kartı</option>
              <option value="limit">Kredi limiti</option>
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Komisyon (%)
            </span>
            <input
              type="number"
              name="commissionPercentage"
              min={0}
              max={100}
              step={1}
              defaultValue={settings.commissionPercentage}
              className={inputClass}
            />
            <input type="hidden" name="commissionType" value="percentage" />
          </label>
        </div>

        {settingsState.error ? (
          <p className="text-sm font-medium text-red-600">{settingsState.error}</p>
        ) : null}
        {settingsState.success ? (
          <p className="text-sm font-medium text-emerald-700">Ayarlar kaydedildi.</p>
        ) : null}

        <button
          type="submit"
          disabled={settingsPending}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {settingsPending ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </form>

      {credentialsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            action={credentialsAction}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-bold text-gray-900">Yolcu360 API Anahtarları</h3>
            <p className="mt-1 text-sm text-gray-500">
              Secret alanını boş bırakırsanız mevcut değer korunur.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">
                  API Key
                </span>
                <input
                  name="apiKey"
                  defaultValue={settings.apiKey}
                  className={inputClass}
                  autoComplete="off"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">
                  API Secret
                </span>
                <input
                  name="apiSecret"
                  type="password"
                  placeholder={settings.hasApiSecret ? "••••••••" : ""}
                  className={inputClass}
                  autoComplete="new-password"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" name="clearSecret" className="rounded" />
                Secret&apos;ı temizle
              </label>
            </div>

            {credentialsState.error ? (
              <p className="mt-3 text-sm text-red-600">{credentialsState.error}</p>
            ) : null}
            {credentialsState.success ? (
              <p className="mt-3 text-sm text-emerald-700">Kimlik bilgileri kaydedildi.</p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCredentialsOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
              >
                Kapat
              </button>
              <button
                type="submit"
                disabled={credentialsPending}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Kaydet
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

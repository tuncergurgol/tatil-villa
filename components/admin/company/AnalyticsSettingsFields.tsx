"use client";

import type { CompanySettings } from "@prisma/client";

function AnalyticsField({
  label,
  name,
  defaultValue,
  hint,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  hint: string;
  placeholder?: string;
}) {
  return (
    <label className="block rounded-2xl border border-gray-200 bg-gray-50/80 px-5 py-4 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1.5 w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400"
      />
      <p className="mt-2 text-xs leading-relaxed text-gray-400">{hint}</p>
    </label>
  );
}

function ScriptTextarea({
  label,
  name,
  defaultValue,
  rows = 5,
}: {
  label: string;
  name: string;
  defaultValue: string;
  rows?: number;
}) {
  return (
    <label className="block rounded-2xl border border-gray-200 bg-gray-50/80 px-5 py-4 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className="mt-1.5 w-full resize-y bg-transparent font-mono text-sm font-medium text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400"
      />
    </label>
  );
}

interface AnalyticsSettingsFieldsProps {
  settings: CompanySettings;
}

export default function AnalyticsSettingsFields({
  settings,
}: AnalyticsSettingsFieldsProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsField
          label="Google Analytics ID"
          name="googleAnalyticsId"
          defaultValue={settings.googleAnalyticsId}
          placeholder="G-XXXXXXXXXX"
          hint="Örn: G-5PDN00BR9S — Analytics → Yönetici → Veri Akışları"
        />
        <AnalyticsField
          label="Google Tag Manager ID"
          name="googleTagManagerId"
          defaultValue={settings.googleTagManagerId}
          placeholder="GTM-XXXXXXX"
          hint="Örn: GTM-TVH3VMWV — tagmanager.google.com → Kapsayıcı ID"
        />
        <AnalyticsField
          label="Google Ads ID"
          name="googleAdsId"
          defaultValue={settings.googleAdsId}
          placeholder="AW-XXXXXXXXX"
          hint="Örn: AW-17063538767 — Google Ads → Araçlar → Dönüşümler"
        />
        <AnalyticsField
          label="Facebook Pixel ID"
          name="facebookPixelId"
          defaultValue={settings.facebookPixelId}
          placeholder="4196254764032585"
          hint="Örn: 4196254764032585 — Meta Events Manager → Piksel ID"
        />
        <AnalyticsField
          label="Microsoft Clarity ID"
          name="microsoftClarityId"
          defaultValue={settings.microsoftClarityId}
          placeholder="qumr08g8y2"
          hint="Örn: qumr08g8y2 — clarity.ms → Settings → Project ID"
        />
        <AnalyticsField
          label="Google Search Console Doğrulama Kodu"
          name="googleSearchConsoleCode"
          defaultValue={settings.googleSearchConsoleCode}
          placeholder="abc123XYZ..."
          hint="Search Console → Mülk ekle → HTML etiketi yöntemini seç. Verilen meta taginin content değerini buraya yapıştır (örn: abc123XYZ...). HTML dosyası yüklemeye gerek yok."
        />
      </div>

      <div className="border-t border-gray-100 pt-6">
        <h3 className="text-sm font-semibold text-gray-900">Özel Scriptler</h3>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          Üçüncü parti araçların script kodlarını buraya yapıştırabilirsiniz.
          Kodlar tüm sayfalara otomatik eklenir.
        </p>

        <div className="mt-4 space-y-4">
          <ScriptTextarea
            label="Head İçine Eklenecek Scriptler — </head> öncesi (örn: meta doğrulama, chat widget)"
            name="headScripts"
            defaultValue={settings.headScripts}
            rows={5}
          />
          <ScriptTextarea
            label="Body İçine Eklenecek Scriptler — </body> öncesi (örn: canlı destek, popup)"
            name="bodyScripts"
            defaultValue={settings.bodyScripts}
            rows={5}
          />
        </div>
      </div>
    </div>
  );
}

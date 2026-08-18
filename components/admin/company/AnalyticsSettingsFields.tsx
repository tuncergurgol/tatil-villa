"use client";

import { useState } from "react";
import type { PublicSiteTrackingRow } from "@/lib/queries/public-site-tracking";
import { PUBLIC_SITE_KEYS } from "@/lib/public-site-keys";
import type { MetaCatalogFeedUrlRow } from "@/lib/meta-catalog-feed-url";

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

function fieldName(siteKey: string, field: string) {
  return `tracking__${siteKey}__${field}`;
}

interface AnalyticsSettingsFieldsProps {
  siteTrackings: PublicSiteTrackingRow[];
  metaCatalogFeedUrls: MetaCatalogFeedUrlRow[];
}

export default function AnalyticsSettingsFields({
  siteTrackings,
  metaCatalogFeedUrls,
}: AnalyticsSettingsFieldsProps) {
  const byKey = new Map(siteTrackings.map((row) => [row.siteKey, row]));
  const [activeKey, setActiveKey] = useState<(typeof PUBLIC_SITE_KEYS)[number]>(
    "tatildeyiz"
  );
  const active = byKey.get(activeKey) ?? siteTrackings[0];

  if (!active) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">
          Site başına Analytics &amp; Search Console
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          Her domain kendi GA4 ve GSC kodunu kullanır. Tatildeyiz değerleri geriye
          dönük uyumluluk için şirket ayarlarıyla da senkron tutulur.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PUBLIC_SITE_KEYS.map((siteKey) => {
            const row = byKey.get(siteKey);
            const selected = siteKey === activeKey;
            return (
              <button
                key={siteKey}
                type="button"
                onClick={() => setActiveKey(siteKey)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  selected
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {row?.label ?? siteKey}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-violet-200 bg-violet-50/60 px-5 py-4">
        <h3 className="text-sm font-semibold text-violet-900">
          Meta / WhatsApp Katalog Beslemesi
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-violet-800/90">
          Commerce Manager → Veri kaynakları → Veri beslemesi → URL kullanın.
          Meta için önce R2 URL&apos;sini deneyin (Cloudflare bot korumasından
          etkilenmez). Token gerekmez.
        </p>
        <div className="mt-4 space-y-3">
          {metaCatalogFeedUrls.map((feed) => (
            <label
              key={feed.siteKey}
              className="block rounded-xl border border-violet-200 bg-white px-4 py-3"
            >
              <span className="text-xs font-medium text-violet-700">
                {feed.label}
              </span>
              <input
                readOnly
                value={feed.url}
                className="mt-1.5 w-full bg-transparent font-mono text-[11px] text-gray-800 outline-none"
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
          ))}
        </div>
      </div>

      {PUBLIC_SITE_KEYS.map((siteKey) => {
        const row = byKey.get(siteKey);
        if (!row) return null;
        const visible = siteKey === activeKey;
        return (
          <div
            key={siteKey}
            className={visible ? "space-y-6" : "hidden"}
            aria-hidden={!visible}
          >
            <p className="text-xs text-gray-500">
              Domain:{" "}
              <span className="font-semibold text-gray-800">{row.domain}</span>
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <AnalyticsField
                label="Google Analytics ID"
                name={fieldName(siteKey, "googleAnalyticsId")}
                defaultValue={row.googleAnalyticsId}
                placeholder="G-XXXXXXXXXX"
                hint="Örn: G-5PDN00BR9S — Analytics → Yönetici → Veri Akışları"
              />
              <AnalyticsField
                label="Google Tag Manager ID"
                name={fieldName(siteKey, "googleTagManagerId")}
                defaultValue={row.googleTagManagerId}
                placeholder="GTM-XXXXXXX"
                hint="Örn: GTM-TVH3VMWV — tagmanager.google.com → Kapsayıcı ID"
              />
              <AnalyticsField
                label="Google Ads ID"
                name={fieldName(siteKey, "googleAdsId")}
                defaultValue={row.googleAdsId}
                placeholder="AW-XXXXXXXXX"
                hint="Örn: AW-17063538767 — Google Ads → Araçlar → Dönüşümler"
              />
              <AnalyticsField
                label="Facebook Pixel ID"
                name={fieldName(siteKey, "facebookPixelId")}
                defaultValue={row.facebookPixelId}
                placeholder="4196254764032585"
                hint="Örn: 4196254764032585 — Meta Events Manager → Piksel ID"
              />
              <AnalyticsField
                label="Microsoft Clarity ID"
                name={fieldName(siteKey, "microsoftClarityId")}
                defaultValue={row.microsoftClarityId}
                placeholder="qumr08g8y2"
                hint="Örn: qumr08g8y2 — clarity.ms → Settings → Project ID"
              />
              <AnalyticsField
                label="Google Search Console Doğrulama Kodu"
                name={fieldName(siteKey, "googleSearchConsoleCode")}
                defaultValue={row.googleSearchConsoleCode}
                placeholder="abc123XYZ..."
                hint="Search Console → HTML etiketi → meta content değerini yapıştırın. DNS TXT yöntemi de kullanılabilir (Cloudflare)."
              />
              <AnalyticsField
                label="Bing Webmaster (Edge / Opera / Copilot)"
                name={fieldName(siteKey, "bingWebmasterCode")}
                defaultValue={row.bingWebmasterCode}
                placeholder="msvalidate.01 içeriği"
                hint="bing.com/webmasters → Sitenizi ekleyin → HTML meta etiketi content değeri. Edge ve Opera araması Bing indeksini kullanır."
              />
              <AnalyticsField
                label="Yandex Webmaster Doğrulama Kodu"
                name={fieldName(siteKey, "yandexWebmasterCode")}
                defaultValue={row.yandexWebmasterCode}
                placeholder="yandex-verification içeriği"
                hint="webmaster.yandex.com.tr → Site ekle → Meta etiketi content değeri."
              />
            </div>

            <div className="rounded-2xl border border-teal-200 bg-teal-50/60 px-5 py-4">
              <h3 className="text-sm font-semibold text-teal-900">
                Arama ve yapay zeka keşif adresleri
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-teal-800/90">
                Bu adresler otomatik üretilir. Bing/Yandex/IndexNow ve ChatGPT,
                Perplexity, Claude, Gemini gibi yapay zekalar buradan site haritasını
                okur. Webmaster panellerinde sitemap olarak{" "}
                <code className="rounded bg-white/80 px-1">/sitemap.xml</code> gönderin.
              </p>
              <div className="mt-4 grid gap-3">
                {[
                  { label: "Sitemap", value: `https://${row.domain}/sitemap.xml` },
                  { label: "robots.txt", value: `https://${row.domain}/robots.txt` },
                  { label: "llms.txt (AI)", value: `https://${row.domain}/llms.txt` },
                  { label: "RSS", value: `https://${row.domain}/rss.xml` },
                  { label: "IndexNow anahtar dosyası", value: row.indexNowKeyUrl },
                ].map((item) => (
                  <label
                    key={item.label}
                    className="block rounded-xl border border-teal-200 bg-white px-4 py-3"
                  >
                    <span className="text-xs font-medium text-teal-700">
                      {item.label}
                    </span>
                    <input
                      readOnly
                      value={item.value}
                      className="mt-1.5 w-full bg-transparent font-mono text-[11px] text-gray-800 outline-none"
                      onFocus={(event) => event.currentTarget.select()}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-semibold text-gray-900">
                Özel Scriptler ({row.label})
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                Bu siteye özel üçüncü parti scriptler. Yalnızca ilgili domain
                sayfalarına eklenir.
              </p>
              <div className="mt-4 space-y-4">
                <ScriptTextarea
                  label="Head içine eklenecek scriptler"
                  name={fieldName(siteKey, "headScripts")}
                  defaultValue={row.headScripts}
                  rows={5}
                />
                <ScriptTextarea
                  label="Body içine eklenecek scriptler"
                  name={fieldName(siteKey, "bodyScripts")}
                  defaultValue={row.bodyScripts}
                  rows={5}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

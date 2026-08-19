"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileWarning, Globe } from "lucide-react";
import { setUndocumentedVillaPublishForSite } from "@/app/actions/admin/company-settings";
import {
  PUBLIC_SITE_KEYS,
  PUBLIC_SITE_META,
  isPublicSiteKey,
  type PublicSiteKey,
} from "@/lib/public-site-keys";

interface UndocumentedVillaPublishSettingsProps {
  allowedSiteKeys: string[];
}

export default function UndocumentedVillaPublishSettings({
  allowedSiteKeys,
}: UndocumentedVillaPublishSettingsProps) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<PublicSiteKey[]>(() =>
    allowedSiteKeys.filter(isPublicSiteKey)
  );
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<PublicSiteKey | null>(null);
  const [isPending, startTransition] = useTransition();

  function setPublish(siteKey: PublicSiteKey, publish: boolean) {
    const previous = allowed;
    setError(null);
    setAllowed((current) =>
      publish
        ? Array.from(new Set([...current, siteKey]))
        : current.filter((key) => key !== siteKey)
    );
    setPendingKey(siteKey);
    startTransition(async () => {
      const result = await setUndocumentedVillaPublishForSite(siteKey, publish);
      setPendingKey(null);
      if (result.error) {
        setAllowed(previous);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <FileWarning className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Belgesi olmayan villalar
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Konut / turizm belgesi (belge no veya belge türü) olmayan villalar
            aktif yayınlanır; ana sayfa ve detaylı aramada görünmez, teklif
            alanında ve Bont Uygunluk Ara’da görünür. Kapalı sitelerde detay
            sayfası da açılmaz.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Domain</th>
              <th className="w-64 px-4 py-3 text-right">Belgesiz villa</th>
            </tr>
          </thead>
          <tbody>
            {PUBLIC_SITE_KEYS.map((siteKey) => {
              const meta = PUBLIC_SITE_META[siteKey];
              const publish = allowed.includes(siteKey);
              const disabled = isPending && pendingKey === siteKey;

              return (
                <tr key={siteKey} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 font-medium text-gray-900">
                      <Globe className="h-4 w-4 text-teal-500" />
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{meta.domain}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end rounded-xl border border-gray-200 p-1">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setPublish(siteKey, false)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                          !publish
                            ? "bg-gray-800 text-white"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        Yayınlama
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setPublish(siteKey, true)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                          publish
                            ? "bg-teal-600 text-white"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        Yayınla
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

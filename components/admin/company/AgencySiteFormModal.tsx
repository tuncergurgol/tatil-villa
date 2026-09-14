"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileWarning, Globe, Loader2, Trash2, X } from "lucide-react";
import {
  createAgencySite,
  deleteAgencySite,
  setAgencySiteActive,
  updateAgencySite,
} from "@/app/actions/admin/agency-sites";
import { setUndocumentedVillaPublishForSite } from "@/app/actions/admin/company-settings";
import {
  AGENCY_SITE_SERVICES,
  normalizeAgencySiteServices,
} from "@/lib/agency-site-services";
import type { AgencySiteItem } from "@/lib/queries/agency-sites";
import { PUBLIC_BRAND_ASSET_GROUPS } from "@/lib/public-brand-assets";
import {
  getPublicSiteMeta,
  isPublicSiteKey,
  listPublicSiteKeys,
  type PublicSiteKey,
} from "@/lib/public-site-keys";

interface AgencySiteFormModalProps {
  /** null = yeni kayıt. Modal yalnızca açıkken mount edilir. */
  item: AgencySiteItem | null;
  undocumentedPublishSiteKeys: string[];
  onClose: () => void;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

function normalizeDomain(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .replace(/^www\./i, "")
    .toLowerCase();
}

function findPublicSiteKey(domain: string): PublicSiteKey | null {
  const target = normalizeDomain(domain);
  if (!target) return null;
  return (
    listPublicSiteKeys().find(
      (key) => normalizeDomain(getPublicSiteMeta(key).domain) === target
    ) ?? null
  );
}

function findBrandAssetGroup(domain: string) {
  const target = normalizeDomain(domain);
  if (!target) return null;
  return (
    PUBLIC_BRAND_ASSET_GROUPS.find(
      (group) => normalizeDomain(group.domain) === target
    ) ?? null
  );
}

function SegmentedChoice({
  value,
  onChange,
  disabled,
  options,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  options: [{ label: string; value: false }, { label: string; value: true }];
}) {
  return (
    <div className="inline-flex rounded-xl border border-gray-200 p-1">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
            value === option.value
              ? option.value
                ? "bg-teal-600 text-white"
                : "bg-gray-800 text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function AgencySiteFormModal({
  item,
  undocumentedPublishSiteKeys,
  onClose,
}: AgencySiteFormModalProps) {
  const router = useRouter();
  const allowedKeys = useMemo(
    () => undocumentedPublishSiteKeys.filter(isPublicSiteKey),
    [undocumentedPublishSiteKeys]
  );

  const [name, setName] = useState(item?.name ?? "");
  const [domain, setDomain] = useState(item?.domain ?? "");
  const [active, setActive] = useState(item?.active ?? true);
  const [publishUndocumented, setPublishUndocumented] = useState(() => {
    const siteKey = item ? findPublicSiteKey(item.domain) : null;
    return siteKey ? allowedKeys.includes(siteKey) : false;
  });
  const [services, setServices] = useState<string[]>(() =>
    normalizeAgencySiteServices(
      item?.publishedServices ?? AGENCY_SITE_SERVICES.map((entry) => entry.key)
    )
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const publicSiteKey = findPublicSiteKey(domain);
  const brandGroup = findBrandAssetGroup(domain);
  const initialPublish = publicSiteKey
    ? allowedKeys.includes(publicSiteKey)
    : false;

  function toggleService(key: string, publish: boolean) {
    setServices((current) =>
      normalizeAgencySiteServices(
        publish
          ? [...current, key]
          : current.filter((service) => service !== key)
      )
    );
  }

  function handleSave() {
    const trimmedName = name.trim();
    const trimmedDomain = domain.trim();
    if (!trimmedName) {
      setError("Site adı gerekli");
      return;
    }
    if (!trimmedDomain.includes(".")) {
      setError("Geçerli bir domain girin");
      return;
    }

    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", trimmedName);
      formData.set("domain", trimmedDomain);
      if (item) formData.set("id", item.id);
      for (const service of normalizeAgencySiteServices(services)) {
        formData.append("services", service);
      }

      const saved = item
        ? await updateAgencySite({}, formData)
        : await createAgencySite({}, formData);
      if (saved.error) {
        setError(saved.error);
        return;
      }

      if (item && active !== item.active) {
        const statusResult = await setAgencySiteActive(item.id, active);
        if (statusResult.error) {
          setError(statusResult.error);
          return;
        }
      }

      if (publicSiteKey && publishUndocumented !== initialPublish) {
        const publishResult = await setUndocumentedVillaPublishForSite(
          publicSiteKey,
          publishUndocumented
        );
        if (publishResult.error) {
          setError(publishResult.error);
          return;
        }
      }

      router.refresh();
      onClose();
    });
  }

  function handleDelete() {
    if (!item) return;
    if (!window.confirm(`"${item.name}" sitesi kalıcı olarak silinsin mi?`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteAgencySite(item.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="inline-flex items-center gap-2">
            <Globe className="h-5 w-5 text-teal-600" />
            <h3 className="text-base font-bold text-gray-900">
              {item ? "Site Kaydını Düzenle" : "Yeni Site Kaydı"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Site Adı
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
                placeholder="Örn. TATİL VİLLACISI"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Domain Adı
              </span>
              <input
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                className={inputClass}
                placeholder="ornek.com"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Durum</p>
              <p className="text-xs text-gray-500">
                Pasif siteler rezervasyon formundaki Site Bilgisi listesinde
                görünmez.
              </p>
            </div>
            <SegmentedChoice
              value={active}
              onChange={setActive}
              disabled={isPending || !item}
              options={[
                { label: "Pasif", value: false },
                { label: "Aktif", value: true },
              ]}
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Yayındaki hizmetler
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Bu sitenin ana sayfasındaki arama sekmelerinde gösterilecek
                  hizmetler.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    setServices(
                      AGENCY_SITE_SERVICES.map((service) => service.key)
                    )
                  }
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Tümünü seç
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setServices(normalizeAgencySiteServices([]))}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Tümünü kaldır
                </button>
              </div>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">Hizmet</th>
                  <th className="w-48 px-4 py-2.5 text-right">Yayında</th>
                </tr>
              </thead>
              <tbody>
                {AGENCY_SITE_SERVICES.map((service) => (
                  <tr key={service.key} className="border-t border-gray-100">
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-gray-900">
                        {service.label}
                      </span>
                      {service.required ? (
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                          Zorunlu
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end">
                        <SegmentedChoice
                          value={services.includes(service.key)}
                          onChange={(next) => toggleService(service.key, next)}
                          disabled={isPending || service.required}
                          options={[
                            { label: "Kapalı", value: false },
                            { label: "Açık", value: true },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-gray-200 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <FileWarning className="h-4 w-4" />
                </div>
                <div className="max-w-md">
                  <p className="text-sm font-semibold text-gray-900">
                    Belgesi olmayan villalar
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Belge no / belge türü olmayan villalar ana sayfa ve detaylı
                    aramada görünmez; teklif alanında ve Bont Uygunluk Ara’da
                    görünür. Kapalı sitelerde detay sayfası da açılmaz.
                  </p>
                </div>
              </div>
              {publicSiteKey ? (
                <SegmentedChoice
                  value={publishUndocumented}
                  onChange={setPublishUndocumented}
                  disabled={isPending}
                  options={[
                    { label: "Yayınlama", value: false },
                    { label: "Yayınla", value: true },
                  ]}
                />
              ) : (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  Bu domain public sitelerle eşleşmiyor.
                </p>
              )}
            </div>
          </div>

          {brandGroup ? (
            <div className="rounded-xl border border-gray-200 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">
                Site logoları
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {brandGroup.domain} için marka görselleri.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex h-16 w-40 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={brandGroup.assets[0]?.path}
                    alt={`${brandGroup.label} logo`}
                    className="max-h-12 w-auto max-w-full object-contain"
                  />
                </div>
                <ul className="flex flex-1 flex-wrap gap-2">
                  {brandGroup.assets.map((asset) => (
                    <li key={asset.path}>
                      <a
                        href={asset.path}
                        download={asset.fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                      >
                        <span>{asset.label}</span>
                        <Download className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-5 py-4">
          {item ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Sil
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import type { CompanySettings } from "@prisma/client";
import { Download, Trash2, UploadCloud } from "lucide-react";
import { uploadCompanyAsset } from "@/app/actions/admin/company-assets";

type AssetKey = "logoUrl" | "faviconUrl" | "ogImageUrl" | "whiteLogoUrl";

interface AssetConfig {
  key: AssetKey;
  assetType: "logo" | "favicon" | "ogImage" | "whiteLogo";
  title: string;
  helperText: string;
  accept: string;
  previewClassName?: string;
}

const ASSETS: AssetConfig[] = [
  {
    key: "logoUrl",
    assetType: "logo",
    title: "Logo",
    helperText: "PNG, SVG, JPG — Olduğu gibi yüklenir, dönüştürme yapılmaz.",
    accept: "image/png,image/jpeg,image/svg+xml,image/webp",
  },
  {
    key: "faviconUrl",
    assetType: "favicon",
    title: "Favicon",
    helperText: "ICO, PNG veya SVG — Tarayıcı sekmesinde görünecek ikon.",
    accept: "image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml,.ico",
    previewClassName: "h-16 w-16",
  },
  {
    key: "ogImageUrl",
    assetType: "ogImage",
    title: "OG Image (Sosyal Medya Görseli)",
    helperText:
      "Sosyal medyada paylaşıldığında görünecek görsel. Önerilen: 1200x630px",
    accept: "image/png,image/jpeg,image/webp",
  },
  {
    key: "whiteLogoUrl",
    assetType: "whiteLogo",
    title: "Beyaz Logo",
    helperText:
      "Koyu arka planlarda kullanılacak beyaz versiyon. PNG veya SVG önerilir.",
    accept: "image/png,image/svg+xml,image/webp",
    previewClassName: "bg-gray-800 rounded-lg p-4",
  },
];

interface LogoSettingsFieldsProps {
  settings: CompanySettings;
}

function ImageUploadCard({
  config,
  value,
  onChange,
}: {
  config: AssetConfig;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileSelect(file: File | undefined) {
    if (!file) return;

    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("assetType", config.assetType);

    startTransition(async () => {
      const result = await uploadCompanyAsset(formData);
      if (result.success) {
        onChange(result.url);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">{config.title}</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!value}
            onClick={() => value && window.open(value, "_blank")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            İndir
          </button>
          <button
            type="button"
            disabled={!value}
            onClick={() => onChange("")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Kaldır
          </button>
        </div>
      </div>

      <div className="flex min-h-44 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/80 p-6">
        {value ? (
          <img
            src={value}
            alt={config.title}
            className={`max-h-32 max-w-full object-contain ${config.previewClassName ?? ""}`}
          />
        ) : (
          <span className="text-sm text-gray-400">Henüz görsel yüklenmedi</span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={config.accept}
        className="hidden"
        onChange={(e) => {
          handleFileSelect(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        <UploadCloud className="h-4 w-4" />
        {isPending ? "Yükleniyor..." : "Dosya Seç"}
      </button>

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        {config.helperText}
      </p>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      <input type="hidden" name={config.key} value={value} />
    </div>
  );
}

export default function LogoSettingsFields({
  settings,
}: LogoSettingsFieldsProps) {
  const [urls, setUrls] = useState({
    logoUrl: settings.logoUrl,
    faviconUrl: settings.faviconUrl,
    ogImageUrl: settings.ogImageUrl,
    whiteLogoUrl: settings.whiteLogoUrl,
  });

  function updateUrl(key: AssetKey, url: string) {
    setUrls((prev) => ({ ...prev, [key]: url }));
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {ASSETS.map((config) => (
        <ImageUploadCard
          key={config.key}
          config={config}
          value={urls[config.key]}
          onChange={(url) => updateUrl(config.key, url)}
        />
      ))}
    </div>
  );
}

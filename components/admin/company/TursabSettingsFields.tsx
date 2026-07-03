"use client";

import { useRef, useState, useTransition } from "react";
import type { CompanySettings } from "@prisma/client";
import { Download, Trash2, UploadCloud } from "lucide-react";
import { uploadCompanyAsset } from "@/app/actions/admin/company-assets";

function SettingsField({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block rounded-2xl border border-gray-200 bg-gray-50/80 px-5 py-4 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1.5 w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400"
      />
    </label>
  );
}

function SettingsSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block rounded-2xl border border-gray-200 bg-gray-50/80 px-5 py-4 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1.5 w-full bg-transparent text-sm font-semibold text-gray-900 outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TursabLogoUpload({
  value,
  onChange,
}: {
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
    formData.append("assetType", "tursabLogo");

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
        <h3 className="text-sm font-semibold text-gray-900">
          TÜRSAB Doğrulama Logosu
        </h3>
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
            alt="TÜRSAB doğrulama logosu"
            className="max-h-32 max-w-full object-contain"
          />
        ) : (
          <span className="text-sm text-gray-400">Henüz logo yüklenmedi</span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
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
        Firmanızın TÜRSAB doğrulama logosu — footer&apos;da görünecektir.
      </p>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <input type="hidden" name="tursabVerificationLogoUrl" value={value} />
    </div>
  );
}

interface TursabSettingsFieldsProps {
  settings: CompanySettings;
}

export default function TursabSettingsFields({
  settings,
}: TursabSettingsFieldsProps) {
  const [verificationLogoUrl, setVerificationLogoUrl] = useState(
    settings.tursabVerificationLogoUrl
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <SettingsField
          label="TÜRSAB Belge No"
          name="tursabNo"
          defaultValue={settings.tursabNo}
        />
        <SettingsSelect
          label="TÜRSAB Ortamı"
          name="tursabEnvironment"
          defaultValue={settings.tursabEnvironment || "production"}
          options={[
            { value: "production", label: "Production" },
            { value: "sandbox", label: "Sandbox" },
          ]}
        />
        <SettingsField
          label="Vergi Numarası"
          name="taxNumber"
          defaultValue={settings.taxNumber}
        />
        <SettingsField
          label="Mersis No"
          name="mersisNo"
          defaultValue={settings.mersisNo}
        />
        <SettingsField
          label="Ticaret Odası Adı"
          name="chamberOfCommerce"
          defaultValue={settings.chamberOfCommerce}
        />
      </div>

      <div className="space-y-4">
        <SettingsField
          label="TÜRSAB Rota White Label URL"
          name="tursabWhiteLabelUrl"
          defaultValue={settings.tursabWhiteLabelUrl}
          placeholder="https://whitelabel.tursabrota.com/..."
        />
        <TursabLogoUpload
          value={verificationLogoUrl}
          onChange={setVerificationLogoUrl}
        />
        <SettingsField
          label="Vergi Dairesi"
          name="taxOffice"
          defaultValue={settings.taxOffice}
        />
        <SettingsField
          label="Ticaret Sicil No"
          name="tradeRegistryNo"
          defaultValue={settings.tradeRegistryNo}
        />
        <SettingsField
          label="KEP Adresi"
          name="kepAddress"
          type="email"
          defaultValue={settings.kepAddress}
        />
      </div>
    </div>
  );
}

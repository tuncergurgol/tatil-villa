"use client";

import { useState } from "react";
import type { CompanySettings } from "@prisma/client";

function SettingsField({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label
      className={`block rounded-2xl border border-gray-200 bg-gray-50/80 px-5 py-4 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 ${className}`}
    >
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

function extractMapEmbedSrc(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http")) return trimmed;
  const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
  return srcMatch?.[1] ?? null;
}

interface ContactSettingsFieldsProps {
  settings: CompanySettings;
}

export default function ContactSettingsFields({
  settings,
}: ContactSettingsFieldsProps) {
  const [mapEmbed, setMapEmbed] = useState(settings.googleMapsEmbed);
  const mapSrc = extractMapEmbedSrc(mapEmbed);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsField
          label="E-posta"
          name="email"
          type="email"
          defaultValue={settings.email}
        />
        <SettingsField
          label="Telefon"
          name="phone"
          defaultValue={settings.phone}
        />
        <SettingsField
          label="Telefon 2"
          name="phone2"
          defaultValue={settings.phone2}
        />
        <SettingsField
          label="Ofis Numarası"
          name="officePhone"
          defaultValue={settings.officePhone}
        />
      </div>

      <label className="block rounded-2xl border border-gray-200 bg-gray-50/80 px-5 py-4 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
        <span className="text-xs font-medium text-gray-500">WhatsApp</span>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700">
            <span aria-hidden>🇹🇷</span>
            <span>+90</span>
          </span>
          <input
            name="whatsapp"
            defaultValue={settings.whatsapp}
            placeholder="252 618 01 08"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400"
          />
        </div>
      </label>

      <SettingsField
        label="Adres"
        name="address"
        defaultValue={settings.address}
      />

      <SettingsField
        label="Çalışma Saatleri"
        name="workingHours"
        defaultValue={settings.workingHours}
        placeholder="09:00 - 23:59"
      />

      <label className="block rounded-2xl border border-gray-200 bg-gray-50/80 px-5 py-4 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
        <span className="text-xs font-medium text-gray-500">
          Google Harita Embed Kodu
        </span>
        <textarea
          name="googleMapsEmbed"
          rows={3}
          value={mapEmbed}
          onChange={(e) => setMapEmbed(e.target.value)}
          placeholder='https://www.google.com/maps/embed?pb=... veya <iframe src="...">'
          className="mt-1.5 w-full resize-y bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400"
        />
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          Google Maps&apos;te konumunuzu bulun — Paylaş — Haritayı yerleştir —
          iframe kodunu kopyalayıp yukarıya yapıştırın.
        </p>
      </label>

      {mapSrc ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
          <iframe
            title="Harita önizleme"
            src={mapSrc}
            className="h-80 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
          Harita önizlemesi için embed kodu girin
        </div>
      )}
    </div>
  );
}

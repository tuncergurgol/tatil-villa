"use client";

import { useState } from "react";
import type { CompanySettings } from "@prisma/client";
import {
  getSmtpProviderPreset,
  getSortedSmtpProviderOptions,
  getSmtpSecureLabel,
  type SmtpProviderId,
} from "@/lib/smtp-presets";

interface MailSettingsFieldsProps {
  settings: CompanySettings;
}

const inputClass =
  "mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-50/80 px-5 py-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100";

const readonlyClass =
  "mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-100 px-5 py-4 text-sm font-medium text-gray-700";

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-500">
      {children}
    </label>
  );
}

export default function MailSettingsFields({ settings }: MailSettingsFieldsProps) {
  const [provider, setProvider] = useState(settings.smtpProvider || "google");
  const [host, setHost] = useState(settings.smtpHost);
  const [port, setPort] = useState(String(settings.smtpPort));
  const [secure, setSecure] = useState(settings.smtpSecure);
  const [smtpUser, setSmtpUser] = useState(settings.smtpUser);
  const [fromEmail, setFromEmail] = useState(settings.smtpFromEmail);

  function applyProviderPreset(nextProvider: string) {
    const preset = getSmtpProviderPreset(nextProvider);
    setProvider(nextProvider);
    setHost(preset.host);
    setPort(String(preset.port));
    setSecure(preset.secure);
  }

  function handleUserChange(value: string) {
    setSmtpUser(value);
    if (!fromEmail.trim()) {
      setFromEmail(value);
    }
  }

  const preset = getSmtpProviderPreset(provider);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4 text-sm text-blue-900">
        Google / Gmail SMTP bilgileri sağlayıcı seçildiğinde otomatik doldurulur.
        Gönderim için mail adresi ve şifre girilmelidir.
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50/80 px-5 py-4">
        <input
          type="checkbox"
          name="smtpEnabled"
          defaultChecked={settings.smtpEnabled}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm font-medium text-gray-700">
          E-posta gönderimini etkinleştir
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="smtpProvider">Sağlayıcı</FieldLabel>
          <select
            id="smtpProvider"
            name="smtpProvider"
            value={provider}
            onChange={(event) => applyProviderPreset(event.target.value)}
            className={inputClass}
          >
            {getSortedSmtpProviderOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-500">{preset.helpText}</p>
        </div>

        <div>
          <FieldLabel>Güvenlik</FieldLabel>
          <div className={readonlyClass}>{getSmtpSecureLabel(secure)}</div>
          <input type="hidden" name="smtpSecure" value={secure} />
        </div>

        <div>
          <FieldLabel>SMTP Sunucusu</FieldLabel>
          <div className={readonlyClass}>{host}</div>
          <input type="hidden" name="smtpHost" value={host} />
        </div>

        <div>
          <FieldLabel>SMTP Port</FieldLabel>
          <div className={readonlyClass}>{port}</div>
          <input type="hidden" name="smtpPort" value={port} />
        </div>

        <div>
          <FieldLabel htmlFor="smtpUser">Mail Adresi</FieldLabel>
          <input
            id="smtpUser"
            name="smtpUser"
            type="email"
            value={smtpUser}
            onChange={(event) => handleUserChange(event.target.value)}
            placeholder="rezervasyon@tatildeyiz.com.tr"
            className={inputClass}
          />
        </div>

        <div>
          <FieldLabel htmlFor="smtpPassword">Mail Şifresi</FieldLabel>
          <input
            id="smtpPassword"
            name="smtpPassword"
            type="password"
            defaultValue={settings.smtpPassword}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>

        <div>
          <FieldLabel htmlFor="smtpFromEmail">Gönderen E-posta</FieldLabel>
          <input
            id="smtpFromEmail"
            name="smtpFromEmail"
            type="email"
            value={fromEmail}
            onChange={(event) => setFromEmail(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <FieldLabel htmlFor="smtpFromName">Gönderen Adı</FieldLabel>
          <input
            id="smtpFromName"
            name="smtpFromName"
            defaultValue={settings.smtpFromName}
            placeholder="tatildeyiz.com.tr"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}

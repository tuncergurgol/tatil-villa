"use client";

import { useActionState, useState } from "react";
import type { CompanySettings } from "@prisma/client";
import {
  BarChart3,
  Building2,
  Hourglass,
  Image,
  Landmark,
  Palette,
  Phone,
  Save,
  Search,
  Share2,
  Shield,
} from "lucide-react";
import {
  saveCompanySettings,
  type CompanySettingsActionState,
} from "@/app/actions/admin/company-settings";
import ContactSettingsFields from "@/components/admin/company/ContactSettingsFields";
import LogoSettingsFields from "@/components/admin/company/LogoSettingsFields";
import TursabSettingsFields from "@/components/admin/company/TursabSettingsFields";
import AnalyticsSettingsFields from "@/components/admin/company/AnalyticsSettingsFields";

const tabs = [
  { id: "genel", label: "Genel Bilgiler", icon: Building2 },
  { id: "iletisim", label: "İletişim", icon: Phone },
  { id: "banka", label: "Banka / Kasa", icon: Landmark },
  { id: "tema", label: "Görünüm & Tema", icon: Palette },
  { id: "logo", label: "Logo & Görseller", icon: Image },
  { id: "tursab", label: "TÜRSAB & Yasal", icon: Shield },
  { id: "sosyal", label: "Sosyal Medya", icon: Share2 },
  { id: "seo", label: "SEO", icon: Search },
  { id: "analytics", label: "Analytics & Scriptler", icon: BarChart3 },
  { id: "loading", label: "Loading Screen", icon: Hourglass },
] as const;

type TabId = (typeof tabs)[number]["id"];

interface CompanySettingsFormProps {
  settings: CompanySettings;
}

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

function SettingsTextarea({
  label,
  name,
  defaultValue,
  rows = 4,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block rounded-2xl border border-gray-200 bg-gray-50/80 px-5 py-4 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1.5 w-full resize-y bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400"
      />
    </label>
  );
}

function TabPanel({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={active ? "block" : "hidden"} aria-hidden={!active}>
      {children}
    </div>
  );
}

const initialState: CompanySettingsActionState = {};

export default function CompanySettingsForm({
  settings,
}: CompanySettingsFormProps) {
  const [activeTab, setActiveTab] = useState<TabId>("genel");
  const [state, formAction, pending] = useActionState(
    saveCompanySettings,
    initialState
  );

  return (
    <form action={formAction} className="mx-auto max-w-5xl">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
              <Building2 className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Şirket Ayarları</h1>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {pending ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>

        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {state.success && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Ayarlar başarıyla kaydedildi.
            </div>
          )}
          {state.error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {state.error}
            </div>
          )}

          <TabPanel active={activeTab === "genel"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsField
                label="Acenta Adı"
                name="agencyName"
                defaultValue={settings.agencyName}
              />
              <SettingsField
                label="Marka Adı"
                name="brandName"
                defaultValue={settings.brandName}
              />
              <SettingsField
                label="Şirket Ünvanı"
                name="companyTitle"
                defaultValue={settings.companyTitle}
              />
              <SettingsField
                label="Domain"
                name="domain"
                defaultValue={settings.domain}
              />
            </div>
          </TabPanel>

          <TabPanel active={activeTab === "iletisim"}>
            <ContactSettingsFields settings={settings} />
          </TabPanel>

          <TabPanel active={activeTab === "banka"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsField
                label="Banka Adı"
                name="bankName"
                defaultValue={settings.bankName}
              />
              <SettingsField
                label="Hesap Sahibi"
                name="accountHolder"
                defaultValue={settings.accountHolder}
              />
              <div className="sm:col-span-2">
                <SettingsField
                  label="IBAN"
                  name="iban"
                  defaultValue={settings.iban}
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                />
              </div>
            </div>
          </TabPanel>

          <TabPanel active={activeTab === "tema"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsField
                label="Ana Renk"
                name="primaryColor"
                type="color"
                defaultValue={settings.primaryColor}
              />
              <SettingsField
                label="İkincil Renk"
                name="secondaryColor"
                type="color"
                defaultValue={settings.secondaryColor}
              />
            </div>
          </TabPanel>

          <TabPanel active={activeTab === "logo"}>
            <LogoSettingsFields settings={settings} />
          </TabPanel>

          <TabPanel active={activeTab === "tursab"}>
            <TursabSettingsFields settings={settings} />
          </TabPanel>

          <TabPanel active={activeTab === "sosyal"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsField
                label="Instagram"
                name="instagram"
                defaultValue={settings.instagram}
                placeholder="https://instagram.com/..."
              />
              <SettingsField
                label="Facebook"
                name="facebook"
                defaultValue={settings.facebook}
                placeholder="https://facebook.com/..."
              />
              <SettingsField
                label="X (Twitter)"
                name="twitter"
                defaultValue={settings.twitter}
                placeholder="https://x.com/..."
              />
              <SettingsField
                label="YouTube"
                name="youtube"
                defaultValue={settings.youtube}
                placeholder="https://youtube.com/..."
              />
            </div>
          </TabPanel>

          <TabPanel active={activeTab === "seo"}>
            <div className="grid gap-4">
              <SettingsField
                label="SEO Başlık"
                name="seoTitle"
                defaultValue={settings.seoTitle}
              />
              <SettingsTextarea
                label="SEO Açıklama"
                name="seoDescription"
                defaultValue={settings.seoDescription}
                rows={4}
              />
            </div>
          </TabPanel>

          <TabPanel active={activeTab === "analytics"}>
            <AnalyticsSettingsFields settings={settings} />
          </TabPanel>

          <TabPanel active={activeTab === "loading"}>
            <div className="grid gap-4">
              <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50/80 px-5 py-4">
                <input
                  type="checkbox"
                  name="loadingEnabled"
                  defaultChecked={settings.loadingEnabled}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Yükleme ekranını etkinleştir
                </span>
              </label>
              <SettingsField
                label="Yükleme Metni"
                name="loadingText"
                defaultValue={settings.loadingText}
                placeholder="Yükleniyor..."
              />
            </div>
          </TabPanel>
        </div>
      </div>
      <input type="hidden" name="legalText" defaultValue={settings.legalText} />
      <input type="hidden" name="customScripts" defaultValue={settings.customScripts} />
    </form>
  );
}

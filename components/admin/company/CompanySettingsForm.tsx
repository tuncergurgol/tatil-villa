"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanySettings } from "@prisma/client";
import {
  BarChart3,
  Building2,
  CreditCard,
  Globe,
  Hourglass,
  Image,
  Landmark,
  Mail,
  MessageCircle,
  MessageSquare,
  Palette,
  Phone,
  Save,
  Search,
  Share2,
  Shield,
  Wallet,
} from "lucide-react";
import {
  saveCompanySettings,
  type CompanySettingsActionState,
} from "@/app/actions/admin/company-settings";
import ContactSettingsFields from "@/components/admin/company/ContactSettingsFields";
import LogoSettingsFields from "@/components/admin/company/LogoSettingsFields";
import TursabSettingsFields from "@/components/admin/company/TursabSettingsFields";
import AnalyticsSettingsFields from "@/components/admin/company/AnalyticsSettingsFields";
import type { PublicSiteTrackingRow } from "@/lib/queries/public-site-tracking";
import PrepaymentPaymentTypeManagement from "@/components/admin/prepayment-payment-types/PrepaymentPaymentTypeManagement";
import CustomerContactChannelManagement from "@/components/admin/customer-contact-channels/CustomerContactChannelManagement";
import CompanyBankAccountManagement from "@/components/admin/company/CompanyBankAccountManagement";
import AgencySiteManagement from "@/components/admin/company/AgencySiteManagement";
import PaymentProviderManagement from "@/components/admin/company/PaymentProviderManagement";
import MailSettingsFields from "@/components/admin/company/MailSettingsFields";
import WhatsAppSettingsFields from "@/components/admin/company/WhatsAppSettingsFields";
import ThemeColorPalette from "@/components/admin/company/ThemeColorPalette";
import HomeVillaSectionsFields from "@/components/admin/company/HomeVillaSectionsFields";
import type { PrepaymentPaymentTypeItem } from "@/lib/queries/prepayment-payment-types";
import type { CustomerContactChannelItem } from "@/lib/queries/customer-contact-channels";
import type { CompanyBankAccountItem } from "@/lib/queries/company-bank-accounts";
import type { AgencySiteItem } from "@/lib/queries/agency-sites";
import type { PaymentProviderItem } from "@/lib/queries/payment-providers";
import type { MetaCatalogFeedUrlRow } from "@/lib/meta-catalog-feed-url";

const tabs = [
  { id: "genel", label: "Genel Bilgiler", icon: Building2 },
  { id: "iletisim", label: "İletişim", icon: Phone },
  { id: "mail-kurulumu", label: "Mail Kurulumu", icon: Mail },
  { id: "whatsapp-kurulumu", label: "WhatsApp Kurulumu", icon: MessageSquare },
  { id: "banka", label: "Banka / Kasa", icon: Landmark },
  { id: "tema", label: "Görünüm & Tema", icon: Palette },
  { id: "logo", label: "Logo & Görseller", icon: Image },
  { id: "tursab", label: "TÜRSAB & Yasal", icon: Shield },
  { id: "sosyal", label: "Sosyal Medya", icon: Share2 },
  { id: "seo", label: "SEO", icon: Search },
  { id: "analytics", label: "Analytics & Scriptler", icon: BarChart3 },
  { id: "loading", label: "Loading Screen", icon: Hourglass },
  {
    id: "on-odeme-odeme-tipleri",
    label: "Ön Ödeme Ödeme Tipleri",
    icon: CreditCard,
  },
  {
    id: "musteri-ulasm-kanali",
    label: "Müşteri Ulaşım Kanalı",
    icon: MessageCircle,
  },
  {
    id: "acentenin-siteleri",
    label: "Acentenin Siteleri",
    icon: Globe,
  },
  {
    id: "odeme-yonetimi",
    label: "Ödeme Yönetimi",
    icon: Wallet,
  },
] as const;

type TabId = (typeof tabs)[number]["id"];

interface CompanySettingsFormProps {
  settings: CompanySettings;
  siteTrackings: PublicSiteTrackingRow[];
  metaCatalogFeedUrls: MetaCatalogFeedUrlRow[];
  initialTab?: string;
  prepayment: {
    items: PrepaymentPaymentTypeItem[];
    totalCount: number;
    activeCount: number;
    passiveCount: number;
  };
  contactChannels: {
    items: CustomerContactChannelItem[];
    totalCount: number;
    activeCount: number;
    passiveCount: number;
  };
  bankAccounts: {
    items: CompanyBankAccountItem[];
    totalCount: number;
  };
  agencySites: {
    items: AgencySiteItem[];
    totalCount: number;
    activeCount: number;
    passiveCount: number;
  };
  paymentProviders: {
    items: PaymentProviderItem[];
    totalCount: number;
    activeCount: number;
  };
}

function isValidTabId(value: string | undefined): value is TabId {
  return tabs.some((tab) => tab.id === value);
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

function SettingsSelect({
  label,
  name,
  defaultValue,
  options,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <label className="block rounded-2xl border border-gray-200 bg-gray-50/80 px-5 py-4 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1.5 w-full bg-transparent text-sm font-semibold text-gray-900 outline-none"
      >
        {placeholder ? (
          <option value="">{placeholder}</option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
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
  siteTrackings,
  metaCatalogFeedUrls,
  initialTab,
  prepayment,
  contactChannels,
  bankAccounts,
  agencySites,
  paymentProviders,
}: CompanySettingsFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>(
    isValidTabId(initialTab) ? initialTab : "genel"
  );
  const [state, formAction, pending] = useActionState(
    saveCompanySettings,
    initialState
  );

  useEffect(() => {
    if (isValidTabId(initialTab) && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, activeTab]);

  function selectTab(tabId: TabId) {
    setActiveTab(tabId);
    const nextPath =
      tabId === "on-odeme-odeme-tipleri"
        ? "/admin/acente/sirket?tab=on-odeme-odeme-tipleri"
          : tabId === "musteri-ulasm-kanali"
          ? "/admin/acente/sirket?tab=musteri-ulasm-kanali"
          : tabId === "acentenin-siteleri"
            ? "/admin/acente/sirket?tab=acentenin-siteleri"
          : tabId === "odeme-yonetimi"
            ? "/admin/acente/sirket?tab=odeme-yonetimi"
          : tabId === "banka"
            ? "/admin/acente/sirket?tab=banka"
            : tabId === "mail-kurulumu"
              ? "/admin/acente/sirket?tab=mail-kurulumu"
              : tabId === "whatsapp-kurulumu"
                ? "/admin/acente/sirket?tab=whatsapp-kurulumu"
                : "/admin/acente/sirket";
    router.replace(nextPath, { scroll: false });
  }

  const isSettingsTab =
    activeTab !== "on-odeme-odeme-tipleri" &&
    activeTab !== "musteri-ulasm-kanali" &&
    activeTab !== "acentenin-siteleri" &&
    activeTab !== "odeme-yonetimi" &&
    activeTab !== "banka";

  return (
    <div className="flex h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden lg:h-[calc(100dvh-4rem)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
              <Building2 className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Şirket Ayarları</h1>
          </div>
          {isSettingsTab ? (
            <button
              type="submit"
              form="company-settings-form"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {pending ? "Kaydediliyor..." : "Kaydet"}
            </button>
          ) : null}
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
                  onClick={() => selectTab(tab.id)}
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

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {isSettingsTab ? (
            <form id="company-settings-form" action={formAction}>
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

          <TabPanel active={activeTab === "mail-kurulumu"}>
            <MailSettingsFields settings={settings} />
          </TabPanel>

          <TabPanel active={activeTab === "whatsapp-kurulumu"}>
            <WhatsAppSettingsFields />
          </TabPanel>

          <TabPanel active={activeTab === "tema"}>
            <div className="space-y-8">
              <ThemeColorPalette
                initialColors={{
                  primaryColor: settings.primaryColor,
                  secondaryColor: settings.secondaryColor,
                  accentColor: settings.accentColor,
                  surfaceColor: settings.surfaceColor,
                }}
              />
              <HomeVillaSectionsFields settings={settings} />
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
              <div className="sm:col-span-2">
                <SettingsField
                  label="Google Yorum Linki"
                  name="googleReviewUrl"
                  defaultValue={settings.googleReviewUrl}
                  placeholder="https://g.page/r/.../review"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Misafir yorum formu sonrası isteğe bağlı Google yönlendirmesi
                  için kullanılır.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
                <input
                  type="checkbox"
                  name="guestReviewInvitesEnabled"
                  defaultChecked={settings.guestReviewInvitesEnabled}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
                Çıkış sonrası otomatik misafir yorum davetleri (WhatsApp / e-posta)
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
                <input
                  type="checkbox"
                  name="scheduledBookingMessagesEnabled"
                  defaultChecked={settings.scheduledBookingMessagesEnabled}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
                Zamanlanmış rezervasyon mesajları (11.1, 11.3, 11.4, 40.x otomatik)
              </label>
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
            <AnalyticsSettingsFields
              siteTrackings={siteTrackings}
              metaCatalogFeedUrls={metaCatalogFeedUrls}
            />
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
              <input
                type="hidden"
                name="legalText"
                defaultValue={settings.legalText}
              />
              <input
                type="hidden"
                name="customScripts"
                defaultValue={settings.customScripts}
              />
            </form>
          ) : activeTab === "on-odeme-odeme-tipleri" ? (
            <PrepaymentPaymentTypeManagement
              items={prepayment.items}
              totalCount={prepayment.totalCount}
              activeCount={prepayment.activeCount}
              passiveCount={prepayment.passiveCount}
              embedded
            />
          ) : activeTab === "banka" ? (
            <CompanyBankAccountManagement
              items={bankAccounts.items}
              embedded
            />
          ) : activeTab === "acentenin-siteleri" ? (
            <AgencySiteManagement
              items={agencySites.items}
              totalCount={agencySites.totalCount}
              activeCount={agencySites.activeCount}
              passiveCount={agencySites.passiveCount}
              embedded
            />
          ) : activeTab === "odeme-yonetimi" ? (
            <PaymentProviderManagement
              items={paymentProviders.items}
              embedded
            />
          ) : (
            <CustomerContactChannelManagement
              items={contactChannels.items}
              embedded
            />
          )}
        </div>
      </div>
    </div>
  );
}

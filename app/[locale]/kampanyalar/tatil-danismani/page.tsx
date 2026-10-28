import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { buildPublicAlternates } from "@/lib/i18n/hreflang";
import ConsultantCampaignPageView from "@/components/campaigns/ConsultantCampaignPageView";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { siteConfig } from "@/lib/data";
import {
  formatStoredTurkishPhoneDisplay,
  normalizeStoredTurkishPhone,
} from "@/lib/phone-utils";
import { normalizePhoneToE164, toWhatsAppRecipient } from "@/lib/phone";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: "Tatilinizin Sonuna Kadar Yanınızdayız",
    description:
      "Rezervasyondan çıkış gününe kadar kişisel tatil danışmanı desteği. WhatsApp ve telefon ile sürekli iletişim.",
    alternates: buildPublicAlternates(locale, "/kampanyalar/tatil-danismani"),
  };
}

function companyWhatsappHref(phone: string) {
  const normalized =
    normalizeStoredTurkishPhone(phone) ||
    normalizePhoneToE164(phone) ||
    phone;
  const recipient = toWhatsAppRecipient(normalizePhoneToE164(normalized));
  return recipient ? `https://wa.me/${recipient}` : "#";
}

export default async function ConsultantCampaignPage() {
  const company = await getCompanySettings();
  const phone = company.whatsapp?.trim() || company.phone?.trim() || siteConfig.phone;
  const formatted = formatStoredTurkishPhoneDisplay(phone);

  return (
    <ConsultantCampaignPageView
      whatsappHref={companyWhatsappHref(phone)}
      phoneLabel={formatted === "-" ? phone : formatted}
    />
  );
}

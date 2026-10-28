import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import InstallmentCampaignPageView from "@/components/campaigns/InstallmentCampaignPageView";
import { buildPublicAlternates } from "@/lib/i18n/hreflang";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: "Tüm Kredi Kartlarına 12 Taksit İmkanı",
    description:
      "Villa rezervasyonlarında tüm kredi kartlarına 12 aya varan taksit imkanı. Güvenli ödeme ile tatilinizi bütçenize yayın.",
    alternates: buildPublicAlternates(locale, "/kampanyalar/12-taksit"),
  };
}

export default function InstallmentCampaignPage() {
  return <InstallmentCampaignPageView />;
}

import type { Metadata } from "next";
import InstallmentCampaignPageView from "@/components/campaigns/InstallmentCampaignPageView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tüm Kredi Kartlarına 12 Taksit İmkanı",
  description:
    "Villa rezervasyonlarında tüm kredi kartlarına 12 aya varan taksit imkanı. Güvenli ödeme ile tatilinizi bütçenize yayın.",
  alternates: { canonical: "/kampanyalar/12-taksit" },
};

export default function InstallmentCampaignPage() {
  return <InstallmentCampaignPageView />;
}

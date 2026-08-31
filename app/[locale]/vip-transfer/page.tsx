import type { Metadata } from "next";
import VipTransferPublicPage from "@/components/transfer/VipTransferPublicPage";
import { getPublicTransferPageData } from "@/lib/queries/public-transfer";

export const metadata: Metadata = {
  title: "VIP Transfer",
  description:
    "Havalimanı ve şehirler arası VIP transfer talebi oluşturun. Rota, tarih ve araç tipini seçin.",
};

export const dynamic = "force-dynamic";

export default async function VipTransferPage() {
  const data = await getPublicTransferPageData();
  return <VipTransferPublicPage data={data} />;
}

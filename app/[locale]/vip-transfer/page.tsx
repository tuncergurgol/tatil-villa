import type { Metadata } from "next";
import PublicServicePage from "@/components/PublicServicePage";

export const metadata: Metadata = {
  title: "VIP Transfer",
};

export default function VipTransferPage() {
  return (
    <PublicServicePage
      title="VIP Transfer"
      description="Havalimanı ve şehirler arası VIP transfer ile konforlu ulaşım."
    />
  );
}

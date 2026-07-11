import type { Metadata } from "next";
import PublicServicePage from "@/components/PublicServicePage";

export const metadata: Metadata = {
  title: "Uçak / Otobüs",
};

export default function UcakOtobusPage() {
  return (
    <PublicServicePage
      title="Uçak / Otobüs"
      description="Uçak ve otobüs ulaşım seçenekleriyle seyahatinizi tamamlayın."
    />
  );
}

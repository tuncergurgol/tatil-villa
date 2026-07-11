import type { Metadata } from "next";
import PublicServicePage from "@/components/PublicServicePage";

export const metadata: Metadata = {
  title: "Araç Kiralama",
};

export default function AracKiralamaPage() {
  return (
    <PublicServicePage
      title="Araç Kiralama"
      description="Tatilinize özel araç kiralama seçenekleriyle özgürce keşfe çıkın."
    />
  );
}

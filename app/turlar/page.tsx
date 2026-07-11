import type { Metadata } from "next";
import PublicServicePage from "@/components/PublicServicePage";

export const metadata: Metadata = {
  title: "Tur & Aktivite",
};

export default function TurlarPage() {
  return (
    <PublicServicePage
      title="Tur & Aktivite"
      description="Yöreye özel tur ve aktivite deneyimleri yakında burada."
    />
  );
}

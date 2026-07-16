import type { Metadata } from "next";
import BiletallIframe from "@/components/bilet/BiletallIframe";
import BiletShell from "@/components/bilet/BiletShell";
import { getCompanySettings } from "@/lib/queries/company-settings";

export const metadata: Metadata = {
  title: "Bilet Satın Al",
  description: "Seçtiğiniz bileti tamamlayın — Biletall satın alma.",
};

export const dynamic = "force-dynamic";

export default async function BiletSatinalPage() {
  const settings = await getCompanySettings();

  return (
    <BiletShell
      title="Bilet Satın Al"
      description="Yolcu bilgilerinizi girin ve ödemeyi güvenle tamamlayın."
    >
      <BiletallIframe
        kind="satinal"
        portalSlug={settings.biletallPortalSlug}
        title="Biletall — Bilet Satın Al"
      />
    </BiletShell>
  );
}

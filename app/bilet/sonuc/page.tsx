import type { Metadata } from "next";
import BiletallIframe from "@/components/bilet/BiletallIframe";
import BiletShell from "@/components/bilet/BiletShell";
import { getCompanySettings } from "@/lib/queries/company-settings";

export const metadata: Metadata = {
  title: "Bilet Sonuç / PNR",
  description: "PNR ile biletinizi görüntüleyin — Biletall sonuç ekranı.",
};

export const dynamic = "force-dynamic";

export default async function BiletSonucPage() {
  const settings = await getCompanySettings();

  return (
    <BiletShell
      title="Bilet Sonuç / PNR"
      description="PNR numaranızla rezervasyonunuzu görüntüleyin ve e-biletinizi indirin."
    >
      <BiletallIframe
        kind="sonuc"
        portalSlug={settings.biletallPortalSlug}
        title="Biletall — Bilet Sonuç"
      />
    </BiletShell>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BiletallIframe from "@/components/bilet/BiletallIframe";
import BiletShell from "@/components/bilet/BiletShell";
import { getBiletallPageContext } from "@/lib/biletall-page";

export const metadata: Metadata = {
  title: "Bilet Sonuç / PNR",
  description: "PNR ile biletinizi görüntüleyin — Biletall sonuç ekranı.",
};

export const dynamic = "force-dynamic";

export default async function BiletSonucPage() {
  const { enabled, portalSlug, credentials } = await getBiletallPageContext();
  if (!enabled) redirect("/ucak-otobus");

  return (
    <BiletShell
      title="Bilet Sonuç / PNR"
      description="PNR numaranızla rezervasyonunuzu görüntüleyin ve e-biletinizi indirin."
    >
      <BiletallIframe
        kind="sonuc"
        portalSlug={portalSlug}
        credentials={credentials}
        title="Biletall — Bilet Sonuç"
      />
    </BiletShell>
  );
}

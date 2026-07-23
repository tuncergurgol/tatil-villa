import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BiletallIframe from "@/components/bilet/BiletallIframe";
import BiletShell from "@/components/bilet/BiletShell";
import BiletSonucFallback from "@/components/bilet/BiletSonucFallback";
import { getBiletallPageContext } from "@/lib/biletall-page";
import { hasBiletallResultContext } from "@/lib/biletall-result-context";

export const metadata: Metadata = {
  title: "Bilet Sonuç / PNR",
  description: "PNR ile biletinizi görüntüleyin — Biletall sonuç ekranı.",
};

export const dynamic = "force-dynamic";

type BiletSonucPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BiletSonucPage({ searchParams }: BiletSonucPageProps) {
  const params = await searchParams;
  const { enabled, portalSlug, credentials, routes, publicOrigin, publicHomeUrl } =
    await getBiletallPageContext();
  if (!enabled) redirect("/");

  const hasResultContext = hasBiletallResultContext(params);

  return (
    <BiletShell
      title="Bilet Sonuç / PNR"
      description="Satın alma sonrası biletinizi görüntüleyin. PNR sorgulamak için bilet arama ekranındaki PNR sekmesini kullanın."
      activeKind="sonuc"
      homeUrl={publicHomeUrl}
    >
      {hasResultContext ? (
        <BiletallIframe
          kind="sonuc"
          portalSlug={portalSlug}
          credentials={credentials}
          routes={routes}
          publicOrigin={publicOrigin}
          title="Biletall — Bilet Sonuç"
        />
      ) : (
        <BiletSonucFallback homeUrl={publicHomeUrl} />
      )}
    </BiletShell>
  );
}

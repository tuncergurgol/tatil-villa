import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BiletallIframe from "@/components/bilet/BiletallIframe";
import BiletallResultTracker from "@/components/bilet/BiletallResultTracker";
import BiletShell from "@/components/bilet/BiletShell";
import BiletSonucFallback from "@/components/bilet/BiletSonucFallback";
import { getBiletallPageContext } from "@/lib/biletall-page";
import { hasBiletallResultContext } from "@/lib/biletall-result-context";
import { parseBiletallResultQuery } from "@/lib/biletall-result-query";

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
  const { enabled, portalSlug, credentials, routes, publicOrigin, publicHomeUrl, siteHostname } =
    await getBiletallPageContext();
  if (!enabled) redirect("/");

  const hasResultContext = hasBiletallResultContext(params);
  const resultQuery = parseBiletallResultQuery(params);

  return (
    <BiletShell
      title="Bilet Sonuç / PNR"
      description="Satın alma sonrası biletinizi görüntüleyin. PNR sorgulamak için bilet arama ekranındaki PNR sekmesini kullanın."
      activeKind="sonuc"
      homeUrl={publicHomeUrl}
    >
      {hasResultContext ? (
        <>
          <BiletallResultTracker query={resultQuery} />
          <BiletallIframe
          kind="sonuc"
          portalSlug={portalSlug}
          credentials={credentials}
          routes={routes}
          publicOrigin={publicOrigin}
          siteHostname={siteHostname}
          forwardSessionQuery
          title="Biletall — Bilet Sonuç"
        />
        </>
      ) : (
        <BiletSonucFallback homeUrl={publicHomeUrl} />
      )}
    </BiletShell>
  );
}

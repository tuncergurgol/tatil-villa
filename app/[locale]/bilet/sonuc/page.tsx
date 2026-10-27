import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import BiletallIframe from "@/components/bilet/BiletallIframe";
import BiletallResultTracker from "@/components/bilet/BiletallResultTracker";
import BiletShell from "@/components/bilet/BiletShell";
import BiletSonucFallback from "@/components/bilet/BiletSonucFallback";
import { getBiletallPageContext } from "@/lib/biletall-page";
import { resolveBiletallIframeSrc } from "@/lib/biletall";
import { hasBiletallResultContext } from "@/lib/biletall-result-context";
import { parseBiletallResultQuery } from "@/lib/biletall-result-query";

export const dynamic = "force-dynamic";

type BiletSonucPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ticket");
  return {
    title: t("resultTitle"),
    description: t("resultDescription"),
  };
}

export default async function BiletSonucPage({ searchParams }: BiletSonucPageProps) {
  const t = await getTranslations("ticket");
  const params = await searchParams;
  const {
    enabled,
    portalSlug,
    credentials,
    routes,
    iframeOrigin,
    iframeSiteHostname,
    publicHomeUrl,
  } = await getBiletallPageContext();
  if (!enabled) redirect("/");

  const hasResultContext = hasBiletallResultContext(params);
  const resultQuery = parseBiletallResultQuery(params);
  const iframeSrc = resolveBiletallIframeSrc(
    "sonuc",
    portalSlug,
    credentials,
    routes,
    iframeOrigin,
    iframeSiteHostname
  );

  return (
    <BiletShell
      title={t("resultTitle")}
      description={t("resultDescription")}
      activeKind="sonuc"
      homeUrl={publicHomeUrl}
    >
      {hasResultContext ? (
        <>
          <BiletallResultTracker query={resultQuery} />
          <BiletallIframe
            kind="sonuc"
            src={iframeSrc}
            forwardSessionQuery
            title={t("resultTitle")}
          />
        </>
      ) : (
        <BiletSonucFallback homeUrl={publicHomeUrl} />
      )}
    </BiletShell>
  );
}

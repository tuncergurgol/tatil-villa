import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import BiletallIframe from "@/components/bilet/BiletallIframe";
import BiletShell from "@/components/bilet/BiletShell";
import { resolveBiletallIframeSrc } from "@/lib/biletall";
import { getBiletallPageContext } from "@/lib/biletall-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ticket");
  return {
    title: t("buyTitle"),
    description: t("buyDescription"),
  };
}

export default async function BiletSatinalPage() {
  const t = await getTranslations("ticket");
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

  const iframeSrc = resolveBiletallIframeSrc(
    "satinal",
    portalSlug,
    credentials,
    routes,
    iframeOrigin,
    iframeSiteHostname
  );

  return (
    <BiletShell
      title={t("buyTitle")}
      description={t("buyDescription")}
      activeKind="satinal"
      homeUrl={publicHomeUrl}
    >
      <BiletallIframe
        kind="satinal"
        src={iframeSrc}
        forwardSessionQuery
        title={t("buyTitle")}
      />
    </BiletShell>
  );
}

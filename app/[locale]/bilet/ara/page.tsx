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
    title: t("searchTitle"),
    description: t("searchDescription"),
  };
}

export default async function BiletAraPage() {
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
    "ara",
    portalSlug,
    credentials,
    routes,
    iframeOrigin,
    iframeSiteHostname
  );

  return (
    <BiletShell
      title={t("searchTitle")}
      description={t("searchDescription")}
      activeKind="ara"
      homeUrl={publicHomeUrl}
      size="large"
    >
      <div className="flex w-full max-w-xl flex-col items-center gap-5">
        {!credentials.username || !credentials.password ? (
          <p className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-base text-amber-900 sm:text-lg">
            {t("notConfigured")}
          </p>
        ) : null}
        <BiletallIframe
          kind="ara"
          src={iframeSrc}
          title={t("iframeSearchTitle")}
          enlarged
        />
      </div>
    </BiletShell>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BiletallIframe from "@/components/bilet/BiletallIframe";
import BiletShell from "@/components/bilet/BiletShell";
import { resolveBiletallIframeSrc } from "@/lib/biletall";
import { getBiletallPageContext } from "@/lib/biletall-page";

export const metadata: Metadata = {
  title: "Bilet Satın Al",
  description: "Seçtiğiniz bileti tamamlayın — Biletall satın alma.",
};

export const dynamic = "force-dynamic";

export default async function BiletSatinalPage() {
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
      title="Bilet Satın Al"
      description="Yolcu bilgilerinizi girin ve ödemeyi güvenle tamamlayın."
      activeKind="satinal"
      homeUrl={publicHomeUrl}
    >
      <BiletallIframe
        kind="satinal"
        src={iframeSrc}
        forwardSessionQuery
        title="Biletall — Bilet Satın Al"
      />
    </BiletShell>
  );
}

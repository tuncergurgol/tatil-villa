import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BiletallIframe from "@/components/bilet/BiletallIframe";
import BiletShell from "@/components/bilet/BiletShell";
import { getBiletallPageContext } from "@/lib/biletall-page";

export const metadata: Metadata = {
  title: "Bilet Satın Al",
  description: "Seçtiğiniz bileti tamamlayın — Biletall satın alma.",
};

export const dynamic = "force-dynamic";

export default async function BiletSatinalPage() {
  const { enabled, portalSlug, credentials, routes, publicOrigin, publicHomeUrl, siteHostname } =
    await getBiletallPageContext();
  if (!enabled) redirect("/");

  return (
    <BiletShell
      title="Bilet Satın Al"
      description="Yolcu bilgilerinizi girin ve ödemeyi güvenle tamamlayın."
      activeKind="satinal"
      homeUrl={publicHomeUrl}
    >
      <BiletallIframe
        kind="satinal"
        portalSlug={portalSlug}
        credentials={credentials}
        routes={routes}
        publicOrigin={publicOrigin}
        siteHostname={siteHostname}
        forwardSessionQuery
        title="Biletall — Bilet Satın Al"
      />
    </BiletShell>
  );
}

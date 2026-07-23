import type { Metadata } from "next";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getBiletPublicPathMap, parseBiletallRoutesJson } from "@/lib/biletall-routes";
import UcakOtobusLanding from "./UcakOtobusLanding";

export const metadata: Metadata = {
  title: "Uçak / Otobüs",
  description:
    "Uçak, otobüs bileti ve PNR sorgulama — tatil planını burada başlat, biletini de burada al.",
};

export const dynamic = "force-dynamic";

export default async function UcakOtobusPage() {
  const settings = await getCompanySettings();
  const routes = parseBiletallRoutesJson(settings.biletallRoutesJson);
  const publicPaths = getBiletPublicPathMap(routes);

  return (
    <UcakOtobusLanding
      enabled={settings.biletallEnabled ?? true}
      publicPaths={publicPaths}
    />
  );
}

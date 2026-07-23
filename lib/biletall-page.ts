import type { BiletallCredentials } from "@/lib/biletall";
import { parseBiletallRoutesJson } from "@/lib/biletall-routes";
import { getCompanySettings } from "@/lib/queries/company-settings";

export async function getBiletallPageContext() {
  const settings = await getCompanySettings();
  const credentials: BiletallCredentials = {
    username: settings.biletallUsername,
    password: settings.biletallPassword,
  };
  const routes = parseBiletallRoutesJson(settings.biletallRoutesJson);

  return {
    enabled: settings.biletallEnabled ?? true,
    portalSlug: settings.biletallPortalSlug,
    credentials,
    routes,
  };
}

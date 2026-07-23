import type { BiletallCredentials } from "@/lib/biletall";
import { getCompanySettings } from "@/lib/queries/company-settings";

export async function getBiletallPageContext() {
  const settings = await getCompanySettings();
  const credentials: BiletallCredentials = {
    username: settings.biletallUsername,
    password: settings.biletallPassword,
  };

  return {
    enabled: settings.biletallEnabled ?? true,
    portalSlug: settings.biletallPortalSlug,
    credentials,
  };
}

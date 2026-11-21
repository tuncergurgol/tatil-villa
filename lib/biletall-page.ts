import type { BiletallCredentials } from "@/lib/biletall";
import { resolveBiletallPublicOrigin } from "@/lib/biletall-callbacks";
import { parseBiletallRoutesJson } from "@/lib/biletall-routes";
import {
  resolveBiletallRequestOrigin,
} from "@/lib/biletall-request-origin.server";
import { sanitizePublicBookingDomain } from "@/lib/booking-site-brand";
import { getCompanySettings } from "@/lib/queries/company-settings";

export async function getBiletallPageContext() {
  const settings = await getCompanySettings();
  const credentials: BiletallCredentials = {
    username: settings.biletallUsername,
    password: settings.biletallPassword,
  };
  const requestOrigin = await resolveBiletallRequestOrigin(settings.domain);
  const publicHomeUrl = `${requestOrigin.replace(/\/+$/, "")}/`;
  // Biletall portalında kayıtlı ana domain (SiteAdres + callback URL'leri).
  // Alt marka hostları (tatilvillacisi.com vb.) iframe'de boş ekrana yol açar.
  const iframeOrigin = resolveBiletallPublicOrigin(settings.domain);
  const iframeSiteHostname = sanitizePublicBookingDomain(settings.domain);
  const routes = parseBiletallRoutesJson(settings.biletallRoutesJson);

  return {
    enabled: settings.biletallEnabled ?? true,
    portalSlug: settings.biletallPortalSlug,
    credentials,
    routes,
    iframeOrigin,
    iframeSiteHostname,
    publicHomeUrl,
  };
}

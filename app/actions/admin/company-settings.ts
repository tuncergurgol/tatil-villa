"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { updateCompanySettings } from "@/lib/queries/company-settings";
import {
  PUBLIC_SITE_KEYS,
  type PublicSiteKey,
} from "@/lib/public-site-keys";
import {
  upsertAllPublicSiteTracking,
  type PublicSiteTrackingFields,
} from "@/lib/queries/public-site-tracking";

const trackingFieldsSchema = z.object({
  googleAnalyticsId: z.string(),
  googleAdsId: z.string(),
  microsoftClarityId: z.string(),
  googleTagManagerId: z.string(),
  facebookPixelId: z.string(),
  googleSearchConsoleCode: z.string(),
  headScripts: z.string(),
  bodyScripts: z.string(),
});

const companySettingsSchema = z.object({
  agencyName: z.string(),
  brandName: z.string(),
  companyTitle: z.string(),
  domain: z.string(),
  phone: z.string(),
  phone2: z.string(),
  officePhone: z.string(),
  email: z.string(),
  address: z.string(),
  whatsapp: z.string(),
  workingHours: z.string(),
  googleMapsEmbed: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
  surfaceColor: z.string(),
  logoUrl: z.string(),
  faviconUrl: z.string(),
  ogImageUrl: z.string(),
  whiteLogoUrl: z.string(),
  tursabNo: z.string(),
  tursabEnvironment: z.string(),
  tursabWhiteLabelUrl: z.string(),
  tursabVerificationLogoUrl: z.string(),
  taxNumber: z.string(),
  taxOffice: z.string(),
  mersisNo: z.string(),
  tradeRegistryNo: z.string(),
  chamberOfCommerce: z.string(),
  kepAddress: z.string(),
  legalText: z.string(),
  instagram: z.string(),
  facebook: z.string(),
  twitter: z.string(),
  youtube: z.string(),
  seoTitle: z.string(),
  seoDescription: z.string(),
  customScripts: z.string(),
  loadingEnabled: z.coerce.boolean(),
  loadingText: z.string(),
  smtpProvider: z.string(),
  smtpHost: z.string(),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpSecure: z.string(),
  smtpUser: z.string(),
  smtpPassword: z.string(),
  smtpFromEmail: z.string(),
  smtpFromName: z.string(),
  smtpEnabled: z.coerce.boolean(),
});

function readTrackingFields(
  formData: FormData,
  siteKey: PublicSiteKey
): PublicSiteTrackingFields {
  const prefix = `tracking__${siteKey}__`;
  const raw = {
    googleAnalyticsId: String(formData.get(`${prefix}googleAnalyticsId`) ?? ""),
    googleAdsId: String(formData.get(`${prefix}googleAdsId`) ?? ""),
    microsoftClarityId: String(
      formData.get(`${prefix}microsoftClarityId`) ?? ""
    ),
    googleTagManagerId: String(
      formData.get(`${prefix}googleTagManagerId`) ?? ""
    ),
    facebookPixelId: String(formData.get(`${prefix}facebookPixelId`) ?? ""),
    googleSearchConsoleCode: String(
      formData.get(`${prefix}googleSearchConsoleCode`) ?? ""
    ),
    headScripts: String(formData.get(`${prefix}headScripts`) ?? ""),
    bodyScripts: String(formData.get(`${prefix}bodyScripts`) ?? ""),
  };
  return trackingFieldsSchema.parse(raw);
}

export type CompanySettingsActionState = {
  success?: boolean;
  error?: string;
};

export async function saveCompanySettings(
  _prev: CompanySettingsActionState,
  formData: FormData
): Promise<CompanySettingsActionState> {
  await requireAdmin();

  const parsed = companySettingsSchema.safeParse({
    agencyName: formData.get("agencyName"),
    brandName: formData.get("brandName"),
    companyTitle: formData.get("companyTitle"),
    domain: formData.get("domain"),
    phone: formData.get("phone"),
    phone2: formData.get("phone2"),
    officePhone: formData.get("officePhone"),
    email: formData.get("email"),
    address: formData.get("address"),
    whatsapp: formData.get("whatsapp"),
    workingHours: formData.get("workingHours"),
    googleMapsEmbed: formData.get("googleMapsEmbed"),
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    accentColor: formData.get("accentColor"),
    surfaceColor: formData.get("surfaceColor"),
    logoUrl: formData.get("logoUrl"),
    faviconUrl: formData.get("faviconUrl"),
    ogImageUrl: formData.get("ogImageUrl"),
    whiteLogoUrl: formData.get("whiteLogoUrl"),
    tursabNo: formData.get("tursabNo"),
    tursabEnvironment: formData.get("tursabEnvironment"),
    tursabWhiteLabelUrl: formData.get("tursabWhiteLabelUrl"),
    tursabVerificationLogoUrl: formData.get("tursabVerificationLogoUrl"),
    taxNumber: formData.get("taxNumber"),
    taxOffice: formData.get("taxOffice"),
    mersisNo: formData.get("mersisNo"),
    tradeRegistryNo: formData.get("tradeRegistryNo"),
    chamberOfCommerce: formData.get("chamberOfCommerce"),
    kepAddress: formData.get("kepAddress"),
    legalText: formData.get("legalText"),
    instagram: formData.get("instagram"),
    facebook: formData.get("facebook"),
    twitter: formData.get("twitter"),
    youtube: formData.get("youtube"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
    customScripts: formData.get("customScripts") ?? "",
    loadingEnabled: formData.get("loadingEnabled") === "on",
    loadingText: formData.get("loadingText"),
    smtpProvider: formData.get("smtpProvider"),
    smtpHost: formData.get("smtpHost"),
    smtpPort: formData.get("smtpPort"),
    smtpSecure: formData.get("smtpSecure"),
    smtpUser: formData.get("smtpUser"),
    smtpPassword: formData.get("smtpPassword"),
    smtpFromEmail: formData.get("smtpFromEmail"),
    smtpFromName: formData.get("smtpFromName"),
    smtpEnabled: formData.get("smtpEnabled") === "on",
  });

  if (!parsed.success) {
    return { error: "Geçersiz form verisi" };
  }

  let siteTrackings: Array<{
    siteKey: PublicSiteKey;
    data: PublicSiteTrackingFields;
  }>;
  try {
    siteTrackings = PUBLIC_SITE_KEYS.map((siteKey) => ({
      siteKey,
      data: readTrackingFields(formData, siteKey),
    }));
  } catch {
    return { error: "Analytics form verisi geçersiz" };
  }

  const tatildeyiz = siteTrackings.find((row) => row.siteKey === "tatildeyiz")
    ?.data;

  try {
    await Promise.all([
      updateCompanySettings({
        ...parsed.data,
        ...(tatildeyiz
          ? {
              googleAnalyticsId: tatildeyiz.googleAnalyticsId,
              googleAdsId: tatildeyiz.googleAdsId,
              microsoftClarityId: tatildeyiz.microsoftClarityId,
              googleTagManagerId: tatildeyiz.googleTagManagerId,
              facebookPixelId: tatildeyiz.facebookPixelId,
              googleSearchConsoleCode: tatildeyiz.googleSearchConsoleCode,
              headScripts: tatildeyiz.headScripts,
              bodyScripts: tatildeyiz.bodyScripts,
            }
          : {}),
      }),
      upsertAllPublicSiteTracking(siteTrackings),
    ]);
    revalidatePath("/admin/acente/sirket");
    revalidatePath("/", "layout");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { error: "Kayıt sırasında bir hata oluştu" };
  }
}

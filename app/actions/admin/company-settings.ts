"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { updateCompanySettings } from "@/lib/queries/company-settings";

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
  bankName: z.string(),
  iban: z.string(),
  accountHolder: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
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
  googleAnalyticsId: z.string(),
  googleAdsId: z.string(),
  microsoftClarityId: z.string(),
  googleTagManagerId: z.string(),
  facebookPixelId: z.string(),
  googleSearchConsoleCode: z.string(),
  headScripts: z.string(),
  bodyScripts: z.string(),
  customScripts: z.string(),
  loadingEnabled: z.coerce.boolean(),
  loadingText: z.string(),
});

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
    bankName: formData.get("bankName"),
    iban: formData.get("iban"),
    accountHolder: formData.get("accountHolder"),
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
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
    googleAnalyticsId: formData.get("googleAnalyticsId"),
    googleAdsId: formData.get("googleAdsId"),
    microsoftClarityId: formData.get("microsoftClarityId"),
    googleTagManagerId: formData.get("googleTagManagerId"),
    facebookPixelId: formData.get("facebookPixelId"),
    googleSearchConsoleCode: formData.get("googleSearchConsoleCode"),
    headScripts: formData.get("headScripts"),
    bodyScripts: formData.get("bodyScripts"),
    customScripts: formData.get("customScripts"),
    loadingEnabled: formData.get("loadingEnabled") === "on",
    loadingText: formData.get("loadingText"),
  });

  if (!parsed.success) {
    return { error: "Geçersiz form verisi" };
  }

  try {
    await updateCompanySettings(parsed.data);
    revalidatePath("/admin/acente/sirket");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { error: "Kayıt sırasında bir hata oluştu" };
  }
}

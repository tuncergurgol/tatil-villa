import { getCompanySettings } from "@/lib/queries/company-settings";

export async function getWahaWhatsappAdminData() {
  const settings = await getCompanySettings();

  return {
    wahaBaseUrl:
      settings.wahaBaseUrl?.trim() ||
      process.env.WAHA_BASE_URL?.trim() ||
      "http://localhost:3001",
    wahaApiKey:
      settings.wahaApiKey?.trim() || process.env.WAHA_API_KEY?.trim() || "",
    wahaSessionName:
      settings.wahaSessionName?.trim() ||
      process.env.WAHA_SESSION_NAME?.trim() ||
      "default",
    webhookSecret: settings.whatsappCalendarWebhookSecret,
  };
}

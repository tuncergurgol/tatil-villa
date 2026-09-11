import { getCompanySettings } from "@/lib/queries/company-settings";

export async function getEvolutionWhatsappAdminData() {
  const settings = await getCompanySettings();

  return {
    evolutionBaseUrl:
      settings.evolutionBaseUrl?.trim() ||
      process.env.EVOLUTION_BASE_URL?.trim() ||
      "http://localhost:8080",
    evolutionApiKey:
      settings.evolutionApiKey?.trim() ||
      process.env.EVOLUTION_API_KEY?.trim() ||
      "",
    evolutionInstanceName:
      settings.evolutionInstanceName?.trim() ||
      process.env.EVOLUTION_INSTANCE_NAME?.trim() ||
      "tatil-villa",
    webhookSecret: settings.whatsappCalendarWebhookSecret,
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { getCompanySettings, DEFAULT_COMPANY_SETTINGS } from "@/lib/queries/company-settings";
import {
  getEvolutionConnectionState,
  logoutEvolutionInstance,
} from "@/lib/evolution-client";

export type EvolutionActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type EvolutionConnectionState = {
  configured: boolean;
  status: string | null;
  pushName: string | null;
  phoneId: string | null;
  qrDataUrl: string | null;
  pairingCode: string | null;
  error: string | null;
};

function revalidateEvolutionPage() {
  revalidatePath("/admin/acente/evolution-whatsapp");
}

function getEvolutionConfig(settings: Awaited<ReturnType<typeof getCompanySettings>>) {
  return {
    baseUrl:
      settings.evolutionBaseUrl?.trim() ||
      process.env.EVOLUTION_BASE_URL?.trim() ||
      "http://localhost:8080",
    apiKey:
      settings.evolutionApiKey?.trim() ||
      process.env.EVOLUTION_API_KEY?.trim() ||
      "",
    instanceName:
      settings.evolutionInstanceName?.trim() ||
      process.env.EVOLUTION_INSTANCE_NAME?.trim() ||
      "tatil-villa",
  };
}

function isEvolutionConfigured(config: ReturnType<typeof getEvolutionConfig>) {
  return Boolean(config.baseUrl && config.apiKey);
}

export async function saveEvolutionConnectionSettings(
  _prev: EvolutionActionState,
  formData: FormData
): Promise<EvolutionActionState> {
  await requireAdmin();

  const evolutionBaseUrl = String(formData.get("evolutionBaseUrl") ?? "").trim();
  const evolutionApiKey = String(formData.get("evolutionApiKey") ?? "").trim();
  const evolutionInstanceName =
    String(formData.get("evolutionInstanceName") ?? "tatil-villa").trim() ||
    "tatil-villa";

  if (!evolutionBaseUrl) {
    return { error: "Evolution API sunucu adresi gerekli" };
  }

  if (!evolutionApiKey) {
    return {
      error:
        "Evolution API anahtarı gerekli (evolution/.env → AUTHENTICATION_API_KEY)",
    };
  }

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...DEFAULT_COMPANY_SETTINGS,
      evolutionBaseUrl,
      evolutionApiKey,
      evolutionInstanceName,
    },
    update: {
      evolutionBaseUrl,
      evolutionApiKey,
      evolutionInstanceName,
    },
  });

  revalidateEvolutionPage();
  return { success: true, message: "Evolution API ayarları kaydedildi" };
}

export async function disconnectEvolutionAction(): Promise<EvolutionConnectionState> {
  await requireAdmin();

  const settings = await getCompanySettings();
  const config = getEvolutionConfig(settings);

  if (!isEvolutionConfigured(config)) {
    return {
      configured: false,
      status: null,
      pushName: null,
      phoneId: null,
      qrDataUrl: null,
      pairingCode: null,
      error: null,
    };
  }

  try {
    await logoutEvolutionInstance(config.baseUrl, config.apiKey, config.instanceName);
    const state = await getEvolutionConnectionState(
      config.baseUrl,
      config.apiKey,
      config.instanceName
    );

    return {
      configured: true,
      status: state?.status ?? "STOPPED",
      pushName: state?.pushName ?? null,
      phoneId: null,
      qrDataUrl: null,
      pairingCode: null,
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      status: null,
      pushName: null,
      phoneId: null,
      qrDataUrl: null,
      pairingCode: null,
      error: error instanceof Error ? error.message : "Bağlantı kesilemedi",
    };
  }
}

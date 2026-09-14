"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  getCompanySettings,
  DEFAULT_COMPANY_SETTINGS,
} from "@/lib/queries/company-settings";
import {
  getWahaConnectionState,
  logoutWahaSession,
} from "@/lib/waha-client";

export type WahaActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type WahaConnectionState = {
  configured: boolean;
  status: string | null;
  pushName: string | null;
  phoneId: string | null;
  qrDataUrl: string | null;
  pairingCode: string | null;
  error: string | null;
};

function revalidateWahaPage() {
  revalidatePath("/admin/acente/bildirim-whatsapp");
}

function getWahaConfig(settings: Awaited<ReturnType<typeof getCompanySettings>>) {
  return {
    baseUrl:
      settings.wahaBaseUrl?.trim() ||
      process.env.WAHA_BASE_URL?.trim() ||
      "http://localhost:3001",
    apiKey:
      settings.wahaApiKey?.trim() || process.env.WAHA_API_KEY?.trim() || "",
    sessionName:
      settings.wahaSessionName?.trim() ||
      process.env.WAHA_SESSION_NAME?.trim() ||
      "default",
  };
}

function isWahaConfigured(config: ReturnType<typeof getWahaConfig>) {
  return Boolean(config.baseUrl && config.apiKey);
}

export async function saveWahaConnectionSettings(
  _prev: WahaActionState,
  formData: FormData
): Promise<WahaActionState> {
  await requireAdmin();

  const wahaBaseUrl = String(formData.get("wahaBaseUrl") ?? "").trim();
  const wahaApiKey = String(formData.get("wahaApiKey") ?? "").trim();
  const wahaSessionName =
    String(formData.get("wahaSessionName") ?? "default").trim() || "default";

  if (!wahaBaseUrl) {
    return { error: "WAHA API sunucu adresi gerekli" };
  }

  if (!wahaApiKey) {
    return {
      error: "WAHA API anahtarı gerekli (waha/.env → WAHA_API_KEY)",
    };
  }

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...DEFAULT_COMPANY_SETTINGS,
      wahaBaseUrl,
      wahaApiKey,
      wahaSessionName,
    },
    update: {
      wahaBaseUrl,
      wahaApiKey,
      wahaSessionName,
    },
  });

  revalidateWahaPage();
  return { success: true, message: "WAHA API ayarları kaydedildi" };
}

export async function disconnectWahaAction(): Promise<WahaConnectionState> {
  await requireAdmin();

  const settings = await getCompanySettings();
  const config = getWahaConfig(settings);

  if (!isWahaConfigured(config)) {
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
    await logoutWahaSession(config.baseUrl, config.apiKey, config.sessionName);
    const state = await getWahaConnectionState(
      config.baseUrl,
      config.apiKey,
      config.sessionName
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

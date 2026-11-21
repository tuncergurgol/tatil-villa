"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { DEFAULT_COMPANY_SETTINGS } from "@/lib/queries/company-settings";
import { BILETALL_DEFAULT_PORTAL_SLUG, type BiletallIframeKind } from "@/lib/biletall";
import {
  DEFAULT_BILETALL_ROUTES,
  normalizeBiletallRouteRecord,
  parseBiletallRoutesJson,
  serializeBiletallRoutes,
  type BiletallRouteRecord,
} from "@/lib/biletall-routes";
import {
  sanitizeBiletallIframeSrc,
} from "@/lib/biletall-iframe-src";

export type BiletallSettingsActionState = {
  success?: boolean;
  error?: string;
};

function revalidateBiletallPaths(routes: BiletallRouteRecord[]) {
  revalidatePath("/admin/obilet");
  revalidatePath("/bilet/ara");
  for (const route of routes) {
    revalidatePath(route.publicPath);
  }
  for (const route of DEFAULT_BILETALL_ROUTES) {
    revalidatePath(route.publicPath);
  }
}

async function loadBiletallRoutes(): Promise<BiletallRouteRecord[]> {
  const settings = await prisma.companySettings.findUnique({
    where: { id: "default" },
    select: { biletallRoutesJson: true },
  });
  const routes = parseBiletallRoutesJson(settings?.biletallRoutesJson);
  const cleaned = routes.map((route) => normalizeBiletallRouteRecord(route));
  const hasInvalidCustom = routes.some(
    (route, index) =>
      (route.customIframeSrc?.trim() ?? "") !==
      (cleaned[index]?.customIframeSrc ?? "")
  );
  if (hasInvalidCustom) {
    await persistBiletallRoutes(cleaned);
  }
  return cleaned;
}

async function persistBiletallRoutes(routes: BiletallRouteRecord[]) {
  const json = serializeBiletallRoutes(routes);
  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...DEFAULT_COMPANY_SETTINGS,
      biletallRoutesJson: json,
    },
    update: { biletallRoutesJson: json },
  });
  revalidateBiletallPaths(routes);
}

const schema = z.object({
  biletallEnabled: z.coerce.boolean(),
  biletallPortalSlug: z
    .string()
    .trim()
    .min(1, "Portal slug gerekli")
    .regex(/^[a-z0-9_-]+$/i, "Portal slug yalnızca harf, rakam, _ ve - içerebilir"),
});

export async function saveBiletallSettings(
  _prev: BiletallSettingsActionState,
  formData: FormData
): Promise<BiletallSettingsActionState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    biletallEnabled: formData.get("biletallEnabled") === "on",
    biletallPortalSlug:
      String(formData.get("biletallPortalSlug") ?? "").trim() ||
      BILETALL_DEFAULT_PORTAL_SLUG,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...DEFAULT_COMPANY_SETTINGS,
      biletallEnabled: parsed.data.biletallEnabled,
      biletallPortalSlug: parsed.data.biletallPortalSlug.toLowerCase(),
    },
    update: {
      biletallEnabled: parsed.data.biletallEnabled,
      biletallPortalSlug: parsed.data.biletallPortalSlug.toLowerCase(),
    },
  });

  revalidateBiletallPaths(await loadBiletallRoutes());
  return { success: true };
}

const credentialsSchema = z.object({
  biletallUsername: z.string().trim().max(200),
  biletallPassword: z.string().max(200),
  clearPassword: z.coerce.boolean().optional(),
});

export async function saveBiletallCredentials(
  _prev: BiletallSettingsActionState,
  formData: FormData
): Promise<BiletallSettingsActionState> {
  await requireAdmin();

  const parsed = credentialsSchema.safeParse({
    biletallUsername: String(formData.get("biletallUsername") ?? ""),
    biletallPassword: String(formData.get("biletallPassword") ?? ""),
    clearPassword: formData.get("clearPassword") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }

  const update: {
    biletallUsername: string;
    biletallPassword?: string;
  } = {
    biletallUsername: parsed.data.biletallUsername,
  };

  if (parsed.data.clearPassword) {
    update.biletallPassword = "";
  } else if (parsed.data.biletallPassword.trim()) {
    update.biletallPassword = parsed.data.biletallPassword;
  }

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...DEFAULT_COMPANY_SETTINGS,
      ...update,
    },
    update,
  });

  revalidateBiletallPaths(await loadBiletallRoutes());
  return { success: true };
}

const routeSchema = z.object({
  kind: z.enum(["ara", "satinal", "sonuc"]),
  label: z.string().trim().min(1, "Başlık gerekli").max(120),
  publicPath: z
    .string()
    .trim()
    .min(2, "Public path gerekli")
    .regex(/^\/[a-z0-9/_-]+$/i, "Public path / ile başlamalı"),
  callbackPath: z
    .string()
    .trim()
    .min(2, "Callback path gerekli")
    .regex(/^[a-z0-9/_-]+$/i, "Callback path geçersiz"),
  customIframeSrc: z.string().trim().max(4000).optional(),
});

export async function saveBiletallRoute(
  _prev: BiletallSettingsActionState,
  formData: FormData
): Promise<BiletallSettingsActionState> {
  await requireAdmin();

  const parsed = routeSchema.safeParse({
    kind: String(formData.get("kind") ?? ""),
    label: String(formData.get("label") ?? ""),
    publicPath: String(formData.get("publicPath") ?? ""),
    callbackPath: String(formData.get("callbackPath") ?? ""),
    customIframeSrc: String(formData.get("customIframeSrc") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }

  const customIframeSrc = sanitizeBiletallIframeSrc(
    String(formData.get("customIframeSrc") ?? "")
  );
  const rawIframeInput = String(formData.get("customIframeSrc") ?? "").trim();
  if (rawIframeInput && !customIframeSrc) {
    return {
      error:
        "Iframe URL geçersiz. Biletall'dan yalnızca src adresini veya tam iframe kodunu yapıştırın.",
    };
  }

  const routes = await loadBiletallRoutes();
  const next = routes.map((route) =>
    route.kind === parsed.data.kind
      ? normalizeBiletallRouteRecord({
          kind: parsed.data.kind,
          label: parsed.data.label,
          publicPath: parsed.data.publicPath,
          callbackPath: parsed.data.callbackPath,
          customIframeSrc,
        })
      : route
  );

  await persistBiletallRoutes(next);
  return { success: true };
}

export async function deleteBiletallRoute(
  kind: BiletallIframeKind
): Promise<BiletallSettingsActionState> {
  await requireAdmin();

  const next = DEFAULT_BILETALL_ROUTES.map((route) =>
    route.kind === kind ? normalizeBiletallRouteRecord({ kind }) : route
  );

  await persistBiletallRoutes(next);
  return { success: true };
}

export async function resetBiletallRoutesToDefaults(): Promise<BiletallSettingsActionState> {
  await requireAdmin();

  const routes = DEFAULT_BILETALL_ROUTES.map((route) =>
    normalizeBiletallRouteRecord(route)
  );
  await persistBiletallRoutes(routes);
  return { success: true };
}

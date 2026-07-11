import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/queries/company-settings";

export async function getWhatsappCalendarAdminData() {
  const [settings, groups, messages, mappedVillas] = await Promise.all([
    getCompanySettings(),
    prisma.whatsappCalendarGroup.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.whatsappCalendarMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        villa: {
          select: { id: true, name: true, villaId: true },
        },
      },
    }),
    prisma.villa.findMany({
      where: { whatsappGroupId: { not: "" } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        villaId: true,
        slug: true,
        whatsappGroupId: true,
        whatsappGroupDifferentName: true,
      },
    }),
  ]);

  return {
    enabled: settings.whatsappCalendarEnabled,
    webhookSecret: settings.whatsappCalendarWebhookSecret,
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
    groups,
    messages,
    mappedVillas,
  };
}

export type WhatsappCalendarAdminData = Awaited<
  ReturnType<typeof getWhatsappCalendarAdminData>
>;

export async function getWhatsappCalendarGroupsForPicker() {
  return prisma.whatsappCalendarGroup.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, externalId: true, name: true },
  });
}

import { BulkWhatsappMessageStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function getBulkWhatsappPageData() {
  const [templates, tags, activeCampaign, reportMessages] = await Promise.all([
    prisma.bulkWhatsappTemplate.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.customerTag.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.bulkWhatsappCampaign.findFirst({
      where: {
        status: {
          in: ["DRAFT", "SCHEDULED", "RUNNING", "PAUSED"],
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        messageBody: true,
        salutation: true,
        appendTimestamp: true,
        intervalSeconds: true,
        status: true,
        tagFilterIds: true,
        scheduleEnabled: true,
        scheduleFirstDate: true,
        scheduleFirstTime: true,
        scheduleDays: true,
        scheduleStartTime: true,
        scheduleEndTime: true,
        totalCount: true,
        sentCount: true,
        failedCount: true,
        createdAt: true,
      },
    }),
    prisma.bulkWhatsappOutboundMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        customerName: true,
        phone: true,
        tagLabels: true,
        status: true,
        errorMessage: true,
        sentAt: true,
        createdAt: true,
        campaign: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
  ]);

  return {
    templates,
    tags,
    activeCampaign,
    reportMessages,
  };
}

export type BulkWhatsappPageData = Awaited<
  ReturnType<typeof getBulkWhatsappPageData>
>;

export async function getBulkWhatsappReportMessages(filters?: {
  status?: BulkWhatsappMessageStatus | "ALL";
  tag?: string;
  campaignId?: string;
}) {
  const messages = await prisma.bulkWhatsappOutboundMessage.findMany({
    where: {
      ...(filters?.campaignId ? { campaignId: filters.campaignId } : {}),
      ...(filters?.status && filters.status !== "ALL"
        ? { status: filters.status }
        : {}),
      ...(filters?.tag
        ? { tagLabels: { has: filters.tag } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      customerName: true,
      phone: true,
      tagLabels: true,
      status: true,
      errorMessage: true,
      sentAt: true,
      createdAt: true,
      campaign: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return messages;
}

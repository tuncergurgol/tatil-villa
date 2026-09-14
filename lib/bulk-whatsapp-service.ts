import {
  BulkWhatsappCampaignStatus,
  BulkWhatsappMessageStatus,
  BulkWhatsappSalutation,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  isBulkWhatsappScheduleWindowOpen,
  renderBulkWhatsappMessage,
} from "@/lib/bulk-whatsapp";
import { sendCustomerNotificationWhatsApp } from "@/lib/whatsapp-delivery";
import { normalizeTurkishPhoneDigits } from "@/lib/phone-utils";

type CampaignConfig = {
  title: string;
  messageBody: string;
  templateId?: string | null;
  salutation: BulkWhatsappSalutation;
  appendTimestamp: boolean;
  intervalSeconds: number;
  tagFilterIds: string[];
  scheduleEnabled: boolean;
  scheduleFirstDate?: Date | null;
  scheduleFirstTime: string;
  scheduleDays: string[];
  scheduleStartTime: string;
  scheduleEndTime: string;
};

export async function getBulkWhatsappRecipients(tagFilterIds: string[]) {
  const customers = await prisma.customer.findMany({
    where: {
      active: true,
      phone: { not: "" },
      ...(tagFilterIds.length > 0
        ? {
            tags: {
              some: {
                tagId: { in: tagFilterIds },
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      tags: {
        select: {
          tag: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: [{ fullName: "asc" }, { createdAt: "asc" }],
  });

  const seen = new Set<string>();
  const recipients: Array<{
    customerId: string;
    customerName: string;
    phone: string;
    tagLabels: string[];
  }> = [];

  for (const customer of customers) {
    const digits = normalizeTurkishPhoneDigits(customer.phone);
    if (digits.length < 10) continue;
    const key = digits.slice(-10);
    if (seen.has(key)) continue;
    seen.add(key);

    recipients.push({
      customerId: customer.id,
      customerName: customer.fullName,
      phone: customer.phone,
      tagLabels: customer.tags.map((entry) => entry.tag.name),
    });
  }

  return recipients;
}

export async function createBulkWhatsappCampaign(
  config: CampaignConfig & { createdBy: string }
) {
  const recipients = await getBulkWhatsappRecipients(config.tagFilterIds);
  if (recipients.length === 0) {
    throw new Error("Seçilen filtreye uygun telefonlu müşteri bulunamadı");
  }

  const initialStatus: BulkWhatsappCampaignStatus = config.scheduleEnabled
    ? BulkWhatsappCampaignStatus.SCHEDULED
    : BulkWhatsappCampaignStatus.DRAFT;

  const campaign = await prisma.bulkWhatsappCampaign.create({
    data: {
      title: config.title.trim() || "Toplu WhatsApp",
      messageBody: config.messageBody,
      templateId: config.templateId || null,
      salutation: config.salutation,
      appendTimestamp: config.appendTimestamp,
      intervalSeconds: Math.max(1, config.intervalSeconds),
      tagFilterIds: config.tagFilterIds,
      scheduleEnabled: config.scheduleEnabled,
      scheduleFirstDate: config.scheduleFirstDate ?? null,
      scheduleFirstTime: config.scheduleFirstTime,
      scheduleDays: config.scheduleDays,
      scheduleStartTime: config.scheduleStartTime,
      scheduleEndTime: config.scheduleEndTime,
      status: initialStatus,
      totalCount: recipients.length,
      createdBy: config.createdBy,
      messages: {
        create: recipients.map((recipient) => ({
          customerId: recipient.customerId,
          customerName: recipient.customerName,
          phone: recipient.phone,
          tagLabels: recipient.tagLabels,
          renderedBody: renderBulkWhatsappMessage({
            body: config.messageBody,
            customerName: recipient.customerName,
            salutation: config.salutation,
            appendTimestamp: config.appendTimestamp,
          }),
          status: BulkWhatsappMessageStatus.PENDING,
        })),
      },
    },
  });

  return campaign;
}

async function finalizeCampaignIfDone(campaignId: string) {
  const pending = await prisma.bulkWhatsappOutboundMessage.count({
    where: {
      campaignId,
      status: {
        in: [
          BulkWhatsappMessageStatus.PENDING,
          BulkWhatsappMessageStatus.SENDING,
        ],
      },
    },
  });

  if (pending === 0) {
    await prisma.bulkWhatsappCampaign.update({
      where: { id: campaignId },
      data: {
        status: BulkWhatsappCampaignStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
    return true;
  }

  return false;
}

export async function processBulkWhatsappCampaignNext(campaignId: string) {
  const campaign = await prisma.bulkWhatsappCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    return { ok: false as const, error: "Kampanya bulunamadı" };
  }

  if (campaign.status !== BulkWhatsappCampaignStatus.RUNNING) {
    return {
      ok: false as const,
      error: "Kampanya şu an gönderim modunda değil",
      status: campaign.status,
    };
  }

  if (!isBulkWhatsappScheduleWindowOpen(campaign)) {
    return {
      ok: true as const,
      waitingSchedule: true,
      status: campaign.status,
      sentCount: campaign.sentCount,
      failedCount: campaign.failedCount,
      totalCount: campaign.totalCount,
    };
  }

  const nextMessage = await prisma.bulkWhatsappOutboundMessage.findFirst({
    where: {
      campaignId,
      status: BulkWhatsappMessageStatus.PENDING,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!nextMessage) {
    const done = await finalizeCampaignIfDone(campaignId);
    return {
      ok: true as const,
      done,
      status: done
        ? BulkWhatsappCampaignStatus.COMPLETED
        : campaign.status,
      sentCount: campaign.sentCount,
      failedCount: campaign.failedCount,
      totalCount: campaign.totalCount,
    };
  }

  await prisma.bulkWhatsappOutboundMessage.update({
    where: { id: nextMessage.id },
    data: { status: BulkWhatsappMessageStatus.SENDING },
  });

  const renderedBody = renderBulkWhatsappMessage({
    body: campaign.messageBody,
    customerName: nextMessage.customerName,
    salutation: campaign.salutation,
    appendTimestamp: campaign.appendTimestamp,
    now: new Date(),
  });

  const sendResult = await sendCustomerNotificationWhatsApp(
    nextMessage.phone,
    renderedBody
  );

  const now = new Date();
  if (sendResult.ok) {
    await prisma.$transaction([
      prisma.bulkWhatsappOutboundMessage.update({
        where: { id: nextMessage.id },
        data: {
          status: BulkWhatsappMessageStatus.SENT,
          renderedBody,
          sentAt: now,
          errorMessage: "",
        },
      }),
      prisma.bulkWhatsappCampaign.update({
        where: { id: campaignId },
        data: {
          sentCount: { increment: 1 },
          lastProcessedAt: now,
        },
      }),
    ]);
  } else {
    const errorMessage = sendResult.error ?? "WhatsApp gönderilemedi";
    await prisma.$transaction([
      prisma.bulkWhatsappOutboundMessage.update({
        where: { id: nextMessage.id },
        data: {
          status: BulkWhatsappMessageStatus.FAILED,
          renderedBody,
          errorMessage,
        },
      }),
      prisma.bulkWhatsappCampaign.update({
        where: { id: campaignId },
        data: {
          failedCount: { increment: 1 },
          lastProcessedAt: now,
        },
      }),
    ]);
  }

  const updated = await prisma.bulkWhatsappCampaign.findUnique({
    where: { id: campaignId },
    select: {
      status: true,
      sentCount: true,
      failedCount: true,
      totalCount: true,
      intervalSeconds: true,
    },
  });

  const done = await finalizeCampaignIfDone(campaignId);

  return {
    ok: true as const,
    done,
    status: done
      ? BulkWhatsappCampaignStatus.COMPLETED
      : updated?.status ?? campaign.status,
    sentCount: updated?.sentCount ?? campaign.sentCount,
    failedCount: updated?.failedCount ?? campaign.failedCount,
    totalCount: updated?.totalCount ?? campaign.totalCount,
    waitMs: (updated?.intervalSeconds ?? campaign.intervalSeconds) * 1000,
    lastMessage: {
      customerName: nextMessage.customerName,
      phone: nextMessage.phone,
      success: sendResult.ok,
      error: sendResult.ok ? null : sendResult.error ?? null,
    },
  };
}

export async function runScheduledBulkWhatsappCampaigns() {
  const campaigns = await prisma.bulkWhatsappCampaign.findMany({
    where: {
      status: {
        in: [
          BulkWhatsappCampaignStatus.SCHEDULED,
          BulkWhatsappCampaignStatus.RUNNING,
        ],
      },
      scheduleEnabled: true,
    },
    orderBy: { createdAt: "asc" },
  });

  let activated = 0;
  let processed = 0;

  for (const campaign of campaigns) {
    if (!isBulkWhatsappScheduleWindowOpen(campaign)) continue;

    if (campaign.status === BulkWhatsappCampaignStatus.SCHEDULED) {
      await prisma.bulkWhatsappCampaign.update({
        where: { id: campaign.id },
        data: {
          status: BulkWhatsappCampaignStatus.RUNNING,
          startedAt: new Date(),
        },
      });
      activated += 1;
    }

    const result = await processBulkWhatsappCampaignNext(campaign.id);
    if (result.ok && !result.waitingSchedule) {
      processed += 1;
    }
  }

  return { checked: campaigns.length, activated, processed };
}

export async function setBulkWhatsappCampaignStatus(
  campaignId: string,
  status: BulkWhatsappCampaignStatus
) {
  const now = new Date();
  const data: Prisma.BulkWhatsappCampaignUpdateInput = { status };

  if (status === BulkWhatsappCampaignStatus.RUNNING) {
    data.startedAt = now;
    data.pausedAt = null;
    data.stoppedAt = null;
  } else if (status === BulkWhatsappCampaignStatus.PAUSED) {
    data.pausedAt = now;
  } else if (status === BulkWhatsappCampaignStatus.STOPPED) {
    data.stoppedAt = now;
    await prisma.bulkWhatsappOutboundMessage.updateMany({
      where: {
        campaignId,
        status: BulkWhatsappMessageStatus.PENDING,
      },
      data: {
        status: BulkWhatsappMessageStatus.CANCELLED,
      },
    });
  }

  return prisma.bulkWhatsappCampaign.update({
    where: { id: campaignId },
    data,
  });
}

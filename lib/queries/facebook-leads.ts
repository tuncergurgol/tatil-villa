import { prisma } from "@/lib/db";
import type { FacebookLeadStatus } from "@prisma/client";

export type FacebookLeadListItem = {
  id: string;
  externalLeadId: string;
  fullName: string;
  email: string;
  phone: string;
  formId: string;
  formName: string;
  campaignName: string;
  adName: string;
  status: FacebookLeadStatus;
  adminNote: string;
  contactAttempts: number;
  lastContactAt: Date | null;
  nextFollowUpAt: Date | null;
  contactedBy: string;
  adminSeenAt: Date | null;
  isTest: boolean;
  createdAt: Date;
  updatedAt: Date;
  customFieldsJson: Record<string, string> | null;
  contactLogs: Array<{
    id: string;
    channel: string;
    message: string;
    createdBy: string;
    createdAt: Date;
  }>;
};

export type FacebookLeadCounts = {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  converted: number;
  unseen: number;
  followUpDue: number;
};

function mapCustomFields(
  value: unknown
): Record<string, string> | null {
  if (!value || typeof value !== "object") return null;
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string" && raw.trim()) out[key] = raw.trim();
  }
  return Object.keys(out).length ? out : null;
}

export async function listFacebookLeads(): Promise<FacebookLeadListItem[]> {
  const rows = await prisma.facebookLead.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      contactLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    externalLeadId: row.externalLeadId,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    formId: row.formId,
    formName: row.formName,
    campaignName: row.campaignName,
    adName: row.adName,
    status: row.status,
    adminNote: row.adminNote,
    contactAttempts: row.contactAttempts,
    lastContactAt: row.lastContactAt,
    nextFollowUpAt: row.nextFollowUpAt,
    contactedBy: row.contactedBy,
    adminSeenAt: row.adminSeenAt,
    isTest: row.isTest,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    customFieldsJson: mapCustomFields(row.customFieldsJson),
    contactLogs: row.contactLogs,
  }));
}

export async function getFacebookLeadCounts(): Promise<FacebookLeadCounts> {
  const now = new Date();
  const [total, newCount, contacted, qualified, converted, unseen, followUpDue] =
    await Promise.all([
      prisma.facebookLead.count(),
      prisma.facebookLead.count({ where: { status: "NEW" } }),
      prisma.facebookLead.count({ where: { status: "CONTACTED" } }),
      prisma.facebookLead.count({ where: { status: "QUALIFIED" } }),
      prisma.facebookLead.count({ where: { status: "CONVERTED" } }),
      prisma.facebookLead.count({ where: { adminSeenAt: null } }),
      prisma.facebookLead.count({
        where: {
          nextFollowUpAt: { lte: now },
          status: { in: ["NEW", "CONTACTED", "QUALIFIED"] },
        },
      }),
    ]);

  return {
    total,
    new: newCount,
    contacted,
    qualified,
    converted,
    unseen,
    followUpDue,
  };
}

export async function countNewFacebookLeads(): Promise<number> {
  return prisma.facebookLead.count({ where: { adminSeenAt: null } });
}

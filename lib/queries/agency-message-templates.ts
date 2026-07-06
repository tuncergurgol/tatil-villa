import { prisma } from "@/lib/db";

export type AgencyMessageTemplateItem = {
  id: string;
  rowNo: number;
  name: string;
  recipient: string;
  smsBody: string;
  whatsappBody: string;
  mailBody: string;
  sortOrder: number;
  active: boolean;
};

export async function getAgencyMessageTemplateAdminData() {
  const items = await prisma.agencyMessageTemplate.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { rowNo: "asc" }],
    select: {
      id: true,
      rowNo: true,
      name: true,
      recipient: true,
      smsBody: true,
      whatsappBody: true,
      mailBody: true,
      sortOrder: true,
      active: true,
    },
  });

  return {
    items,
    totalCount: items.length,
  };
}

export async function getAgencyMessageTemplateByRowNo(rowNo: number) {
  return prisma.agencyMessageTemplate.findFirst({
    where: { rowNo, active: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      rowNo: true,
      name: true,
      recipient: true,
      smsBody: true,
      whatsappBody: true,
      mailBody: true,
    },
  });
}

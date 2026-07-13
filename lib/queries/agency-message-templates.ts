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

const agencyMessageTemplateSelect = {
  id: true,
  rowNo: true,
  name: true,
  recipient: true,
  smsBody: true,
  whatsappBody: true,
  mailBody: true,
} as const;

export async function getAgencyMessageTemplateByRowNo(rowNo: number) {
  return prisma.agencyMessageTemplate.findFirst({
    where: { rowNo, active: true },
    orderBy: { sortOrder: "asc" },
    select: agencyMessageTemplateSelect,
  });
}

/** İlk bulunan aktif şablonu döner; aday sırası korunur. */
export async function getAgencyMessageTemplateByRowNos(rowNos: number[]) {
  const uniqueRowNos = [...new Set(rowNos.filter((n) => Number.isFinite(n)))];
  if (uniqueRowNos.length === 0) return null;

  const templates = await prisma.agencyMessageTemplate.findMany({
    where: { rowNo: { in: uniqueRowNos }, active: true },
    orderBy: { sortOrder: "asc" },
    select: agencyMessageTemplateSelect,
  });

  for (const rowNo of uniqueRowNos) {
    const match = templates.find((template) => template.rowNo === rowNo);
    if (match) return match;
  }

  return null;
}

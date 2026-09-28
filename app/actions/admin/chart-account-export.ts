"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  CHART_ACCOUNT_KIND,
  ownerChartAccountCode,
  type ChartAccountKind,
} from "@/lib/chart-account-export";

const REPORT_PATH = "/admin/raporlar/hesap-plani";

export async function saveOwnerAccountingCodeAction(input: {
  ownerId: string;
  accountingCode: string;
}) {
  await requireAdmin();
  const ownerId = input.ownerId.trim();
  const accountingCode = input.accountingCode.trim();
  if (!ownerId) return { error: "Ev sahibi bulunamadı" };
  if (!accountingCode || accountingCode.length > 40) {
    return { error: "Muhasebe kodu gerekli" };
  }
  if (!ownerChartAccountCode(accountingCode)) {
    return { error: "320.01 önekinden sonra ev sahibine özel kodu yazın" };
  }

  await prisma.villaOwner.update({
    where: { id: ownerId },
    data: { accountingCode },
  });
  revalidatePath(REPORT_PATH);
  revalidatePath("/admin/tanimlamalar/villa-sahipleri");
  return { success: true as const };
}

export async function markChartAccountsExportedAction(input: {
  kind: ChartAccountKind;
  rows: Array<{ subjectId: string; accountCode: string }>;
}) {
  const session = await requireAdmin();
  const kind =
    input.kind === CHART_ACCOUNT_KIND.OWNER
      ? CHART_ACCOUNT_KIND.OWNER
      : CHART_ACCOUNT_KIND.CUSTOMER;
  const exportedBy = session.user?.email || session.user?.name || "";
  const rows = input.rows.filter(
    (row) => row.subjectId.trim() && row.accountCode.trim()
  );
  if (rows.length === 0) return { error: "Aktarılacak hesap yok" };

  await prisma.$transaction(
    rows.map((row) =>
      prisma.chartAccountExport.upsert({
        where: {
          kind_subjectId: { kind, subjectId: row.subjectId },
        },
        create: {
          kind,
          subjectId: row.subjectId,
          accountCode: row.accountCode,
          exportedBy,
        },
        update: {
          accountCode: row.accountCode,
          exportedAt: new Date(),
          exportedBy,
        },
      })
    )
  );

  revalidatePath(REPORT_PATH);
  return { success: true as const, count: rows.length };
}

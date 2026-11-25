import { prisma } from "@/lib/db";
import { sendCompanyMail } from "@/lib/email";
import {
  verifyKonutBelgeOnline,
  type KonutBelgeCheckStatus,
} from "@/lib/konut-belge-check";
import {
  getKonutBelgeCheckRows,
  type KonutBelgeCheckRow,
} from "@/lib/queries/konut-belge-check";
import { getCompanySettings } from "@/lib/queries/company-settings";

export const BELGE_KONTROL_NOTIFY_EMAIL = "info@tatildeyiz.com.tr";
export const BELGE_KONTROL_EMAIL_SUBJECT = "BELGE KONTROL";

const BATCH_SIZE = 8;
const BATCH_DELAY_MS = 400;

export type KonutBelgeDailyCheckDeletedRow = {
  documentNo: string;
  villaName: string;
  documentOwnerName: string;
};

export type KonutBelgeDailyCheckResult = {
  ok: boolean;
  checkedCount: number;
  validCount: number;
  invalidCount: number;
  errorCount: number;
  deletedCount: number;
  deleted: KonutBelgeDailyCheckDeletedRow[];
  emailSent: boolean;
  message?: string;
};

type CheckedRow = KonutBelgeCheckRow & {
  status: KonutBelgeCheckStatus;
  checkedAt: string | null;
  errorMessage?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clearVillaDocumentData(villaId: string) {
  await prisma.villa.update({
    where: { id: villaId },
    data: {
      documentType: null,
      documentOwnerName: "",
      documentAddress: "",
      documentRoomCapacity: null,
      documentBedCapacity: null,
      documentImageUrl: "",
      documentNo: "",
    },
  });
}

async function verifyAllRows(rows: KonutBelgeCheckRow[]): Promise<CheckedRow[]> {
  const results: CheckedRow[] = [];

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);

    for (const row of batch) {
      const verification = await verifyKonutBelgeOnline(row.documentNo);
      results.push({
        ...row,
        status: verification.status,
        checkedAt: verification.checkedAt,
        errorMessage: verification.errorMessage,
        checkUrl: verification.checkUrl,
      });
    }

    if (index + BATCH_SIZE < rows.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return results;
}

function buildBelgeKontrolEmailText(input: {
  checkedCount: number;
  validCount: number;
  deleted: KonutBelgeDailyCheckDeletedRow[];
}) {
  const lines = [
    "Bilgilendirme",
    `${input.checkedCount} adet belge kontrol edildi.`,
    `${input.validCount} adet belge onaylı`,
  ];

  if (input.deleted.length > 0) {
    lines.push(
      `Aşağıdaki ${input.deleted.length} adet belge kurum tarafından İPTAL edilmiş olup, sistemimizden SİLİNMİŞTİR.`
    );
  } else {
    lines.push(
      "Kurum tarafından İPTAL edilmiş belge bulunmadı; sistemden silinen kayıt yoktur."
    );
  }

  lines.push("", "Bilgilerinize", "BONT");

  if (input.deleted.length > 0) {
    lines.push("", "Silinen Belge Bilgileri;", "Belge No, Villa Adı, Belge Sahibi");
    for (const row of input.deleted) {
      lines.push(
        `${row.documentNo}, ${row.villaName}, ${row.documentOwnerName}`
      );
    }
  }

  return lines.join("\n");
}

function buildBelgeKontrolEmailHtml(input: {
  checkedCount: number;
  validCount: number;
  deleted: KonutBelgeDailyCheckDeletedRow[];
}) {
  const deletedSection =
    input.deleted.length > 0
      ? `
        <p>Aşağıdaki <strong>${input.deleted.length}</strong> adet belge kurum tarafından İPTAL edilmiş olup, sistemimizden <strong>SİLİNMİŞTİR</strong>.</p>
        <p><strong>Silinen Belge Bilgileri;</strong></p>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
          <thead>
            <tr>
              <th align="left">Belge No</th>
              <th align="left">Villa Adı</th>
              <th align="left">Belge Sahibi</th>
            </tr>
          </thead>
          <tbody>
            ${input.deleted
              .map(
                (row) => `
              <tr>
                <td>${escapeHtml(row.documentNo)}</td>
                <td>${escapeHtml(row.villaName)}</td>
                <td>${escapeHtml(row.documentOwnerName)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      `
      : `<p>Kurum tarafından İPTAL edilmiş belge bulunmadı; sistemden silinen kayıt yoktur.</p>`;

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
      <p><strong>Bilgilendirme</strong></p>
      <p>${input.checkedCount} adet belge kontrol edildi.<br>
      ${input.validCount} adet belge onaylı</p>
      ${deletedSection}
      <p>Bilgilerinize<br><strong>BONT</strong></p>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function sendBelgeKontrolReportEmail(input: {
  checkedCount: number;
  validCount: number;
  deleted: KonutBelgeDailyCheckDeletedRow[];
}) {
  const company = await getCompanySettings();
  const text = buildBelgeKontrolEmailText(input);
  const html = buildBelgeKontrolEmailHtml(input);

  await sendCompanyMail(company, {
    to: BELGE_KONTROL_NOTIFY_EMAIL,
    subject: BELGE_KONTROL_EMAIL_SUBJECT,
    text,
    html,
    bcc: "",
  });
}

export async function runKonutBelgeDailyCheck(): Promise<KonutBelgeDailyCheckResult> {
  const rows = await getKonutBelgeCheckRows();

  if (rows.length === 0) {
    let emailSent = false;
    try {
      await sendBelgeKontrolReportEmail({
        checkedCount: 0,
        validCount: 0,
        deleted: [],
      });
      emailSent = true;
    } catch (error) {
      console.error("[konut-belge-daily-check] e-posta", error);
    }

    return {
      ok: true,
      checkedCount: 0,
      validCount: 0,
      invalidCount: 0,
      errorCount: 0,
      deletedCount: 0,
      deleted: [],
      emailSent,
      message: "Kontrol edilecek konut belgesi bulunamadı",
    };
  }

  const checkedRows = await verifyAllRows(rows);
  const deleted: KonutBelgeDailyCheckDeletedRow[] = [];

  for (const row of checkedRows) {
    if (row.status !== "INVALID") continue;

    await clearVillaDocumentData(row.villaId);
    deleted.push({
      documentNo: row.documentNo,
      villaName: row.villaName,
      documentOwnerName: row.documentOwnerName,
    });
  }

  const validCount = checkedRows.filter((row) => row.status === "VALID").length;
  const invalidCount = checkedRows.filter((row) => row.status === "INVALID").length;
  const errorCount = checkedRows.filter((row) => row.status === "ERROR").length;

  let emailSent = false;
  try {
    await sendBelgeKontrolReportEmail({
      checkedCount: checkedRows.length,
      validCount,
      deleted,
    });
    emailSent = true;
  } catch (error) {
    console.error("[konut-belge-daily-check] e-posta", error);
  }

  return {
    ok: true,
    checkedCount: checkedRows.length,
    validCount,
    invalidCount,
    errorCount,
    deletedCount: deleted.length,
    deleted,
    emailSent,
  };
}

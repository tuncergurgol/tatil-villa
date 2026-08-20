import { PrismaClient } from "@prisma/client";
import {
  AGENCY_MESSAGE_TEMPLATE_ROW_40_1,
  formatAgencyMessageRowNo,
} from "../lib/agency-message-row-no";
import {
  CHECK_IN_INFO_OWNER_MAIL_BODY,
  CHECK_IN_INFO_OWNER_MESSAGE_NAME,
  CHECK_IN_INFO_OWNER_WHATSAPP_BODY,
} from "../lib/agency-message-templates/check-in-info-owner";
import { SCHEDULED_TEMPLATE_PRESETS } from "../lib/agency-message-schedule";

const RECIPIENT = "KARŞILAYAN";

const prisma = new PrismaClient();

/** Eski örnek PNR (116003) vb. sabit numaraları şablon placeholder’ına çevirir. */
function normalizeOwnerBody(body: string, fallback: string): string {
  const trimmed = body.trim();
  if (!trimmed) return fallback;
  const fixed = trimmed
    .replace(/\b\d{4,}\s+nolu rezervasyon/gi, "##REZID## nolu rezervasyon")
    .replace(
      /https?:\/\/[^\s]+\/giris-bilgilendirme\/##rREZID##\/evsahibi/gi,
      "##EVSAHIBIGIRISLINK##"
    )
    .replace(
      /https?:\/\/[^\s]+\/giris-bilgilendirme\/##REZID##\/evsahibi/gi,
      "##EVSAHIBIGIRISLINK##"
    );
  return fixed;
}

async function upsertTemplate() {
  const preset = SCHEDULED_TEMPLATE_PRESETS.find(
    (item) => item.rowNo === AGENCY_MESSAGE_TEMPLATE_ROW_40_1
  );
  const scheduleData = preset
    ? {
        scheduleTiming: preset.scheduleTiming,
        scheduleEnabled: preset.scheduleEnabled,
        scheduleAnchor: preset.scheduleAnchor,
        scheduleOffsetDays: preset.scheduleOffsetDays,
        scheduleHour: preset.scheduleHour,
        scheduleMinute: preset.scheduleMinute,
      }
    : {};

  const existing = await prisma.agencyMessageTemplate.findFirst({
    where: {
      rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_40_1,
      active: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  const whatsappBody = existing?.whatsappBody?.trim()
    ? normalizeOwnerBody(existing.whatsappBody, CHECK_IN_INFO_OWNER_WHATSAPP_BODY)
    : CHECK_IN_INFO_OWNER_WHATSAPP_BODY;
  const smsBody = existing?.smsBody?.trim()
    ? normalizeOwnerBody(existing.smsBody, CHECK_IN_INFO_OWNER_WHATSAPP_BODY)
    : CHECK_IN_INFO_OWNER_WHATSAPP_BODY;
  const mailBody = existing?.mailBody?.trim()
    ? normalizeOwnerBody(existing.mailBody, CHECK_IN_INFO_OWNER_MAIL_BODY)
    : CHECK_IN_INFO_OWNER_MAIL_BODY;

  const data = {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_40_1,
    name: CHECK_IN_INFO_OWNER_MESSAGE_NAME,
    recipient: RECIPIENT,
    smsBody,
    whatsappBody,
    mailBody,
    active: true,
    ...scheduleData,
  };

  if (existing) {
    await prisma.agencyMessageTemplate.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        recipient: data.recipient,
        smsBody: data.smsBody,
        whatsappBody: data.whatsappBody,
        mailBody: data.mailBody,
        active: true,
        ...scheduleData,
      },
    });
    console.log(
      `${formatAgencyMessageRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_40_1)} (${AGENCY_MESSAGE_TEMPLATE_ROW_40_1}) mesaj şablonu doğrulandı / güncellendi.`
    );
    return;
  }

  const maxSort = await prisma.agencyMessageTemplate.aggregate({
    _max: { sortOrder: true },
  });

  await prisma.agencyMessageTemplate.create({
    data: {
      ...data,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  console.log(
    `${formatAgencyMessageRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_40_1)} (${AGENCY_MESSAGE_TEMPLATE_ROW_40_1}) mesaj şablonu eklendi.`
  );
}

async function main() {
  await upsertTemplate();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";
import {
  AGENCY_MESSAGE_TEMPLATE_ROW_11_4,
  AGENCY_MESSAGE_TEMPLATE_ROW_40_2,
  formatAgencyMessageRowNo,
} from "../lib/agency-message-row-no";
import { SCHEDULED_TEMPLATE_PRESETS } from "../lib/agency-message-schedule";
import {
  GUEST_REVIEW_MAIL_BODY,
  GUEST_REVIEW_MESSAGE_NAME,
  GUEST_REVIEW_WHATSAPP_BODY,
  POOL_HEATING_GREETER_MAIL_BODY,
  POOL_HEATING_GREETER_MESSAGE_NAME,
  POOL_HEATING_GREETER_WHATSAPP_BODY,
} from "../lib/agency-message-templates/scheduled-messages";

const prisma = new PrismaClient();

const NEW_TEMPLATES = [
  {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_11_4,
    name: GUEST_REVIEW_MESSAGE_NAME,
    recipient: "MİSAFİR",
    smsBody: GUEST_REVIEW_WHATSAPP_BODY,
    whatsappBody: GUEST_REVIEW_WHATSAPP_BODY,
    mailBody: GUEST_REVIEW_MAIL_BODY,
  },
  {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_40_2,
    name: POOL_HEATING_GREETER_MESSAGE_NAME,
    recipient: "KARŞILAYAN",
    smsBody: POOL_HEATING_GREETER_WHATSAPP_BODY,
    whatsappBody: POOL_HEATING_GREETER_WHATSAPP_BODY,
    mailBody: POOL_HEATING_GREETER_MAIL_BODY,
  },
] as const;

async function upsertNewTemplate(seed: (typeof NEW_TEMPLATES)[number]) {
  const preset = SCHEDULED_TEMPLATE_PRESETS.find((p) => p.rowNo === seed.rowNo);
  const existing = await prisma.agencyMessageTemplate.findFirst({
    where: { rowNo: seed.rowNo, active: true },
    orderBy: { sortOrder: "asc" },
  });

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

  if (existing) {
    await prisma.agencyMessageTemplate.update({
      where: { id: existing.id },
      data: {
        name: seed.name,
        recipient: seed.recipient,
        smsBody: existing.smsBody.trim() ? existing.smsBody : seed.smsBody,
        whatsappBody: existing.whatsappBody.trim()
          ? existing.whatsappBody
          : seed.whatsappBody,
        mailBody: existing.mailBody.trim() ? existing.mailBody : seed.mailBody,
        active: true,
        ...scheduleData,
      },
    });
    console.log(`${formatAgencyMessageRowNo(seed.rowNo)} güncellendi.`);
    return;
  }

  const maxSort = await prisma.agencyMessageTemplate.aggregate({
    _max: { sortOrder: true },
  });

  await prisma.agencyMessageTemplate.create({
    data: {
      ...seed,
      ...scheduleData,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });
  console.log(`${formatAgencyMessageRowNo(seed.rowNo)} eklendi.`);
}

async function applySchedulePresets() {
  for (const preset of SCHEDULED_TEMPLATE_PRESETS) {
    const updated = await prisma.agencyMessageTemplate.updateMany({
      where: { rowNo: preset.rowNo, active: true },
      data: {
        scheduleTiming: preset.scheduleTiming,
        scheduleEnabled: preset.scheduleEnabled,
        scheduleAnchor: preset.scheduleAnchor,
        scheduleOffsetDays: preset.scheduleOffsetDays,
        scheduleHour: preset.scheduleHour,
        scheduleMinute: preset.scheduleMinute,
      },
    });
    if (updated.count > 0) {
      console.log(
        `${formatAgencyMessageRowNo(preset.rowNo)} zamanlama güncellendi.`
      );
    }
  }
}

async function main() {
  for (const seed of NEW_TEMPLATES) {
    await upsertNewTemplate(seed);
  }
  await applySchedulePresets();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";
import {
  AGENCY_MESSAGE_TEMPLATE_ROW_11_1,
  formatAgencyMessageRowNo,
} from "../lib/agency-message-row-no";
import {
  CHECK_IN_INFO_GUEST_MAIL_BODY,
  CHECK_IN_INFO_GUEST_MESSAGE_NAME,
  CHECK_IN_INFO_GUEST_WHATSAPP_BODY,
  isWrongCheckInInfoMailBody,
} from "../lib/agency-message-templates/check-in-info-guest";

const RECIPIENT = "MİSAFİR";

const prisma = new PrismaClient();

async function upsertTemplate() {
  const existing = await prisma.agencyMessageTemplate.findFirst({
    where: {
      rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_11_1,
      active: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  const mailBody =
    existing?.mailBody?.trim() && !isWrongCheckInInfoMailBody(existing.mailBody)
      ? existing.mailBody
      : CHECK_IN_INFO_GUEST_MAIL_BODY;

  const data = {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_11_1,
    name: CHECK_IN_INFO_GUEST_MESSAGE_NAME,
    recipient: RECIPIENT,
    smsBody: CHECK_IN_INFO_GUEST_WHATSAPP_BODY,
    whatsappBody: CHECK_IN_INFO_GUEST_WHATSAPP_BODY,
    mailBody,
    active: true,
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
      },
    });
    console.log(
      `${formatAgencyMessageRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_11_1)} (${AGENCY_MESSAGE_TEMPLATE_ROW_11_1}) mesaj şablonu doğrulandı / WhatsApp + mail güncellendi.`
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
    `${formatAgencyMessageRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_11_1)} (${AGENCY_MESSAGE_TEMPLATE_ROW_11_1}) mesaj şablonu eklendi.`
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

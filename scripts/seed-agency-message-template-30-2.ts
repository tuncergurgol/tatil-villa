import { PrismaClient } from "@prisma/client";
import {
  AGENCY_MESSAGE_TEMPLATE_ROW_30_2,
  formatAgencyMessageRowNo,
} from "../lib/agency-message-row-no";
import {
  OPTION_REQUEST_MAIL_BODY,
  OPTION_REQUEST_MESSAGE_NAME,
  OPTION_REQUEST_SMS_BODY,
  OPTION_REQUEST_WHATSAPP_BODY,
} from "../lib/agency-message-templates/option-request";

const RECIPIENT = "TAKVİM YÖNETEN";

const prisma = new PrismaClient();

async function upsertTemplate() {
  const existing = await prisma.agencyMessageTemplate.findFirst({
    where: {
      rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_30_2,
      active: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  const data = {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_30_2,
    name: OPTION_REQUEST_MESSAGE_NAME,
    recipient: RECIPIENT,
    smsBody: OPTION_REQUEST_SMS_BODY,
    whatsappBody: OPTION_REQUEST_WHATSAPP_BODY,
    mailBody: OPTION_REQUEST_MAIL_BODY,
    active: true,
  };

  if (existing) {
    await prisma.agencyMessageTemplate.update({
      where: { id: existing.id },
      data,
    });
    console.log(
      `${formatAgencyMessageRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_30_2)} mesaj şablonu güncellendi.`
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
    `${formatAgencyMessageRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_30_2)} mesaj şablonu eklendi.`
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

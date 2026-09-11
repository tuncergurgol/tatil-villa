import { PrismaClient } from "@prisma/client";
import {
  AGENCY_MESSAGE_TEMPLATE_ROW_10_4,
  formatAgencyMessageRowNo,
} from "../lib/agency-message-row-no";
import {
  CONFIRMATION_SENT_MAIL_BODY,
  CONFIRMATION_SENT_MESSAGE_NAME,
  CONFIRMATION_SENT_WHATSAPP_BODY,
} from "../lib/agency-message-templates/confirmation-sent";

const RECIPIENT = "MİSAFİR";

const prisma = new PrismaClient();

async function upsertTemplate() {
  const existing = await prisma.agencyMessageTemplate.findFirst({
    where: {
      rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_10_4,
      active: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  const data = {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_10_4,
    name: CONFIRMATION_SENT_MESSAGE_NAME,
    recipient: RECIPIENT,
    smsBody: CONFIRMATION_SENT_WHATSAPP_BODY,
    whatsappBody: CONFIRMATION_SENT_WHATSAPP_BODY,
    mailBody: CONFIRMATION_SENT_MAIL_BODY,
    active: true,
  };

  if (existing) {
    await prisma.agencyMessageTemplate.update({
      where: { id: existing.id },
      data,
    });
    console.log(
      `${formatAgencyMessageRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_10_4)} mesaj şablonu güncellendi.`
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
    `${formatAgencyMessageRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_10_4)} mesaj şablonu eklendi.`
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

import { PrismaClient } from "@prisma/client";
import {
  AGENCY_MESSAGE_TEMPLATE_ROW_10_5,
  formatAgencyMessageRowNo,
} from "../lib/agency-message-row-no";
import {
  RESERVATION_DOCUMENT_SENT_MAIL_BODY,
  RESERVATION_DOCUMENT_SENT_MESSAGE_NAME,
  RESERVATION_DOCUMENT_SENT_SMS_BODY,
  RESERVATION_DOCUMENT_SENT_WHATSAPP_BODY,
} from "../lib/agency-message-templates/reservation-document-sent";

const RECIPIENT = "MİSAFİR";

const prisma = new PrismaClient();

async function upsertTemplate() {
  const existing = await prisma.agencyMessageTemplate.findFirst({
    where: {
      rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_10_5,
      active: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  const data = {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_10_5,
    name: RESERVATION_DOCUMENT_SENT_MESSAGE_NAME,
    recipient: RECIPIENT,
    smsBody: RESERVATION_DOCUMENT_SENT_SMS_BODY,
    whatsappBody: RESERVATION_DOCUMENT_SENT_WHATSAPP_BODY,
    mailBody: RESERVATION_DOCUMENT_SENT_MAIL_BODY,
    active: true,
  };

  if (existing) {
    await prisma.agencyMessageTemplate.update({
      where: { id: existing.id },
      data,
    });
    console.log(
      `${formatAgencyMessageRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_10_5)} mesaj şablonu güncellendi.`
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
    `${formatAgencyMessageRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_10_5)} mesaj şablonu eklendi.`
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

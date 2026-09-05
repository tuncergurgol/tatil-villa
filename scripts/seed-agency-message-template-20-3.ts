import { PrismaClient } from "@prisma/client";
import {
  AGENCY_MESSAGE_TEMPLATE_ROW_20_3,
  formatAgencyMessageRowNo,
} from "../lib/agency-message-row-no";
import {
  PAYMENT_RECEIVED_IYZICO_MESSAGE_BODY,
  PAYMENT_RECEIVED_IYZICO_MESSAGE_NAME,
} from "../lib/agency-message-templates/payment-received-iyzico";

const RECIPIENT = "YÖNETİM";

const prisma = new PrismaClient();

async function upsertTemplate() {
  const existing = await prisma.agencyMessageTemplate.findFirst({
    where: {
      rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_20_3,
      active: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  if (existing) {
    console.log(
      `${formatAgencyMessageRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_20_3)} mesaj şablonu zaten mevcut, atlandı.`
    );
    return;
  }

  const maxSort = await prisma.agencyMessageTemplate.aggregate({
    _max: { sortOrder: true },
  });

  await prisma.agencyMessageTemplate.create({
    data: {
      rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_20_3,
      name: PAYMENT_RECEIVED_IYZICO_MESSAGE_NAME,
      recipient: RECIPIENT,
      smsBody: PAYMENT_RECEIVED_IYZICO_MESSAGE_BODY,
      whatsappBody: PAYMENT_RECEIVED_IYZICO_MESSAGE_BODY,
      mailBody: PAYMENT_RECEIVED_IYZICO_MESSAGE_BODY,
      active: true,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  console.log(
    `${formatAgencyMessageRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_20_3)} mesaj şablonu eklendi.`
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

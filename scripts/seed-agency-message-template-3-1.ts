import { PrismaClient } from "@prisma/client";
import { AGENCY_MESSAGE_TEMPLATE_ROW_3_1 } from "../lib/agency-message-row-no";
import {
  HAVALE_EFT_PAYMENT_MESSAGE_BODY,
  HAVALE_EFT_PAYMENT_MESSAGE_NAME,
} from "../lib/agency-message-templates/havale-eft-payment";

const TEMPLATE_ID = "message_template_3_1";
const RECIPIENT = "MİSAFİR";

const prisma = new PrismaClient();

async function main() {
  const afterRow3 = await prisma.agencyMessageTemplate.findFirst({
    where: { rowNo: 3 },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const sortOrder = (afterRow3?.sortOrder ?? 2) + 1;

  const data = {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_3_1,
    name: HAVALE_EFT_PAYMENT_MESSAGE_NAME,
    recipient: RECIPIENT,
    smsBody: "",
    whatsappBody: HAVALE_EFT_PAYMENT_MESSAGE_BODY,
    mailBody: HAVALE_EFT_PAYMENT_MESSAGE_BODY,
    sortOrder,
    active: true,
  };

  const existing = await prisma.agencyMessageTemplate.findUnique({
    where: { id: TEMPLATE_ID },
  });

  if (existing) {
    await prisma.agencyMessageTemplate.update({
      where: { id: TEMPLATE_ID },
      data,
    });
    console.log("3.1 mesaj şablonu güncellendi.");
    return;
  }

  const duplicate = await prisma.agencyMessageTemplate.findFirst({
    where: {
      rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_3_1,
      name: HAVALE_EFT_PAYMENT_MESSAGE_NAME,
      recipient: RECIPIENT,
      active: true,
    },
  });

  if (duplicate) {
    await prisma.agencyMessageTemplate.update({
      where: { id: duplicate.id },
      data,
    });
    console.log("3.1 mesaj şablonu güncellendi (mevcut kayıt).");
    return;
  }

  await prisma.agencyMessageTemplate.create({
    data: {
      id: TEMPLATE_ID,
      ...data,
    },
  });

  console.log("3.1 mesaj şablonu eklendi.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

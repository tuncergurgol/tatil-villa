import { PrismaClient } from "@prisma/client";
import {
  AGENCY_MESSAGE_TEMPLATE_ROW_1_6,
  AGENCY_MESSAGE_TEMPLATE_ROW_1_7,
} from "../lib/agency-message-row-no";
import {
  PREPAYMENT_BANK_TRANSFER_MESSAGE_BODY,
  PREPAYMENT_BANK_TRANSFER_MESSAGE_NAME,
} from "../lib/agency-message-templates/prepayment-bank-transfer";
import {
  PREPAYMENT_CREDIT_CARD_MESSAGE_BODY,
  PREPAYMENT_CREDIT_CARD_MESSAGE_NAME,
} from "../lib/agency-message-templates/prepayment-credit-card";

const RECIPIENT = "MİSAFİR";

const prisma = new PrismaClient();

const TEMPLATE_SEEDS = [
  {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_1_6,
    name: PREPAYMENT_BANK_TRANSFER_MESSAGE_NAME,
    body: PREPAYMENT_BANK_TRANSFER_MESSAGE_BODY,
  },
  {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_1_7,
    name: PREPAYMENT_CREDIT_CARD_MESSAGE_NAME,
    body: PREPAYMENT_CREDIT_CARD_MESSAGE_BODY,
  },
] as const;

async function upsertTemplate(seed: (typeof TEMPLATE_SEEDS)[number]) {
  const existing = await prisma.agencyMessageTemplate.findFirst({
    where: {
      rowNo: seed.rowNo,
      active: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  const data = {
    rowNo: seed.rowNo,
    name: seed.name,
    recipient: RECIPIENT,
    smsBody: seed.body,
    whatsappBody: seed.body,
    mailBody: seed.body,
    active: true,
  };

  if (existing) {
    await prisma.agencyMessageTemplate.update({
      where: { id: existing.id },
      data,
    });
    console.log(`${seed.rowNo} mesaj şablonu güncellendi.`);
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

  console.log(`${seed.rowNo} mesaj şablonu eklendi.`);
}

async function main() {
  for (const seed of TEMPLATE_SEEDS) {
    await upsertTemplate(seed);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

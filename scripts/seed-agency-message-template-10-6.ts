/**
 * 10.6 — Rezervasyon onaylandı 2. WhatsApp mesajı.
 * Çalıştır: npx tsx scripts/seed-agency-message-template-10-6.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  AGENCY_MESSAGE_TEMPLATE_ROW_10_6,
  formatAgencyMessageRowNo,
} from "../lib/agency-message-row-no";
import {
  RESERVATION_CONFIRMED_FOLLOWUP_MESSAGE_NAME,
  RESERVATION_CONFIRMED_FOLLOWUP_WHATSAPP_BODY,
} from "../lib/agency-message-templates/reservation-confirmed-followup";

const RECIPIENT = "MİSAFİR";

const prisma = new PrismaClient();

async function upsertTemplate() {
  const existing = await prisma.agencyMessageTemplate.findFirst({
    where: {
      rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_10_6,
      active: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  const data = {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_10_6,
    name: RESERVATION_CONFIRMED_FOLLOWUP_MESSAGE_NAME,
    recipient: RECIPIENT,
    smsBody: "",
    whatsappBody: RESERVATION_CONFIRMED_FOLLOWUP_WHATSAPP_BODY,
    mailBody: "",
    active: true,
  };

  if (existing) {
    await prisma.agencyMessageTemplate.update({
      where: { id: existing.id },
      data,
    });
    console.log(
      `${formatAgencyMessageRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_10_6)} mesaj şablonu güncellendi.`
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
    `${formatAgencyMessageRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_10_6)} mesaj şablonu eklendi.`
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

/**
 * Çıkış hatırlatma şablonlarını (11.3 / 40.3) düzeltir.
 *
 *   npx tsx scripts/fix-checkout-reminder-templates.ts
 *   npx tsx scripts/fix-checkout-reminder-templates.ts --write
 */
import { PrismaClient } from "@prisma/client";
import {
  AGENCY_MESSAGE_TEMPLATE_ROW_11_3,
  AGENCY_MESSAGE_TEMPLATE_ROW_40_3,
  formatAgencyMessageRowNo,
} from "../lib/agency-message-row-no";
import {
  CHECKOUT_REMINDER_GUEST_MAIL_BODY,
  CHECKOUT_REMINDER_GUEST_WHATSAPP_BODY,
  CHECKOUT_REMINDER_OWNER_MAIL_BODY,
  CHECKOUT_REMINDER_OWNER_WHATSAPP_BODY,
} from "../lib/agency-message-templates/scheduled-messages";

const prisma = new PrismaClient();
const write = process.argv.includes("--write");

const UPDATES = [
  {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_11_3,
    whatsappBody: CHECKOUT_REMINDER_GUEST_WHATSAPP_BODY,
    mailBody: CHECKOUT_REMINDER_GUEST_MAIL_BODY,
  },
  {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_40_3,
    whatsappBody: CHECKOUT_REMINDER_OWNER_WHATSAPP_BODY,
    mailBody: CHECKOUT_REMINDER_OWNER_MAIL_BODY,
  },
] as const;

async function main() {
  for (const item of UPDATES) {
    const template = await prisma.agencyMessageTemplate.findFirst({
      where: { rowNo: item.rowNo, active: true },
      orderBy: { sortOrder: "asc" },
    });
    if (!template) {
      console.log(`${formatAgencyMessageRowNo(item.rowNo)}: aktif şablon yok, atlandı`);
      continue;
    }

    console.log(`\n${formatAgencyMessageRowNo(item.rowNo)} — ${template.name}`);
    console.log("Mevcut WhatsApp (ilk 120 karakter):");
    console.log(template.whatsappBody.slice(0, 120));

    if (!write) {
      console.log("Yeni WhatsApp (ilk 120 karakter):");
      console.log(item.whatsappBody.slice(0, 120));
      console.log("(dry-run — --write ile uygula)");
      continue;
    }

    await prisma.agencyMessageTemplate.update({
      where: { id: template.id },
      data: {
        whatsappBody: item.whatsappBody,
        smsBody: item.whatsappBody,
        mailBody: item.mailBody,
      },
    });
    console.log("güncellendi.");
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
